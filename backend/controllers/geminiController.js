const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('🤖 Gemini Generative AI Initialized Successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini API:', error.message);
  }
} else {
  console.log('ℹ️  GEMINI_API_KEY not configured. AI assistant will run in rule-based fallback mode.');
}

// System instructions for the health worker decision support assistant
const MEDICAL_CHAT_SYSTEM_PROMPT = `
You are the CommHealth AI Health Assistant, a decision support assistant powered by Gemini. 
You help community health volunteers, ASHA workers, ANMs (Auxiliary Nurse Midwives), and NGO coordinators make medical and administrative decisions.
IMPORTANT SAFETY INSTRUCTIONS:
1. Always frame your advice as supportive. Remind the health worker that you are an AI assistant and they should consult the Primary Health Centre (PHC) medical officer for serious conditions.
2. Keep your answers clear, concise, actionable, and structured (using bullet points and bold text where appropriate).
3. Focus on local Indian health contexts (e.g. ASHA, Anganwadi, PHC, ANM guidelines, common maternal and pediatric health issues in rural India, primary healthcare protocols).
4. Provide practical recommendations for nutrition, hygiene, vaccine schedules, lifestyle changes, and preventative health camps.
`;

// @desc    Gemini AI chatbot query
// @route   POST /api/gemini/chat
// @access  Private
exports.askChatbot = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Query message is required'
      });
    }

    // Fallback if Gemini key is missing
    if (!genAI) {
      const lowMsg = message.toLowerCase();
      let responseText = "CommHealth Assistant (Rule-Based Fallback Mode):\n\nTo unlock true AI capabilities, please set the GEMINI_API_KEY environment variable on Render or in your local .env file.\n\nHere is a default recommendation based on your query:\n";
      
      if (lowMsg.includes('diet') || lowMsg.includes('obesity') || lowMsg.includes('sugar') || lowMsg.includes('diabetes')) {
        responseText += `• **For Diabetes/Sugar**: Restrict refined sugar, white rice, and high-carb food. Focus on fiber-rich food (ragi, whole wheat, pulses, green leafy vegetables) and 30 mins of daily walking.\n• **For Obesity**: portion control, daily exercise, water intake > 2.5L, avoid oily/junk food. Refer to ANM for regular checkups.`;
      } else if (lowMsg.includes('bp') || lowMsg.includes('hypertension') || lowMsg.includes('blood pressure')) {
        responseText += `• **For Hypertension/BP**: Restrict daily salt intake to < 1 teaspoon (5g). Restrict pickle, papad, and processed food. Encourage daily meditation, stress management, and light cardiovascular exercises. Advise monitoring BP weekly at the local PHC.`;
      } else if (lowMsg.includes('pregnant') || lowMsg.includes('pregnancy') || lowMsg.includes('maternal')) {
        responseText += `• **Maternal Care Checklist**:\n  1. Encourage early registration of pregnancy (within 12 weeks) for antenatal care (ANC).\n  2. Ensure intake of Iron & Folic Acid (IFA) tablets daily to prevent anemia.\n  3. Monitor blood pressure and blood sugar regularly to check for preeclampsia or gestational diabetes.\n  4. Ensure Tetanus Toxoid (TT) vaccination schedules are met.`;
      } else {
        responseText += `• For diagnostic questions, advise the patient to visit the nearest Primary Health Centre (PHC) for clinical assessment.\n• Promote regular community awareness sessions on sanitation, handwashing, clean drinking water, and immunization.`;
      }

      return res.status(200).json({
        success: true,
        reply: responseText,
        isFallback: true
      });
    }

    // Initialize Gemini Chat session
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Prepare contents formatted for Gemini
    const contents = [
      { role: 'user', parts: [{ text: MEDICAL_CHAT_SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: "Acknowledged. I will act as the CommHealth Decision Support Assistant for community health workers." }] }
    ];

    // Append history
    history.forEach(chat => {
      contents.push({
        role: chat.role === 'user' ? 'user' : 'model',
        parts: [{ text: chat.text }]
      });
    });

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const responseText = response.text();

    res.status(200).json({
      success: true,
      reply: responseText,
      isFallback: false
    });
  } catch (error) {
    console.error('Gemini Chatbot Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI response. ' + error.message
    });
  }
};

// @desc    Gemini AI citizen metrics assessment
// @route   POST /api/gemini/advisory
// @access  Public (Used to generate custom report card text)
exports.generateAdvisory = async (req, res) => {
  try {
    const { name, age, gender, height, weight, bmi, bmiCategory, temperature, pulseRate, oxygenLevel, bloodPressureSystolic, bloodPressureDiastolic, bloodSugar, status, lifestyle = {}, medicalHistory = {} } = req.body;

    if (!name || !age) {
      return res.status(400).json({
        success: false,
        message: 'Citizen parameters are required'
      });
    }

    const patientStats = `
Citizen Name: ${name}
Age: ${age}, Gender: ${gender}
BMI: ${bmi} (${bmiCategory})
Vitals:
- Temp: ${temperature}°C
- Pulse: ${pulseRate} bpm
- SpO2: ${oxygenLevel}%
- BP: ${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg
- Blood Sugar: ${bloodSugar} mg/dL
Health Status: ${status}
Lifestyle:
- Smoking: ${lifestyle.smoking || 'Never'}
- Alcohol: ${lifestyle.alcohol || 'Never'}
- Exercise: ${lifestyle.exercise || 'None'}
- Diet: ${lifestyle.diet || 'Balanced'}
Medical History:
- Diabetes: ${medicalHistory.diabetes ? 'Yes' : 'No'}
- Hypertension: ${medicalHistory.hypertension ? 'Yes' : 'No'}
- Heart Disease: ${medicalHistory.heartDisease ? 'Yes' : 'No'}
- Pregnant: ${medicalHistory.pregnancy ? 'Yes' : 'No'}
- Meds: ${medicalHistory.medication || 'None'}
`;

    // Fallback if Gemini key is missing
    if (!genAI) {
      // Return static advice paragraph
      let advice = `Based on a clinical review of ${name}'s health metrics, `;
      if (status === 'At Risk') {
        advice += `critical vital signs require immediate attention. It is highly recommended that they visit the local Primary Health Centre (PHC) for a detailed medical examination. Please monitor blood pressure and blood sugar closely and ensure they adhere to any prescribed medications.`;
      } else if (status === 'Needs Improvement') {
        advice += `there are minor deviations in their vitals or BMI. We suggest adopting a balanced diet, engaging in regular physical activity, and tracking their parameters monthly at a community health booth.`;
      } else {
        advice += `their physiological variables are within the healthy normal limits. They should continue maintaining their active lifestyle and balanced diet, with a routine checkup in six months.`;
      }

      return res.status(200).json({
        success: true,
        advisory: advice,
        isFallback: true
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
You are a public health specialist advising a community health worker about a citizen's survey results.
Review the following metrics and generate a concise 3-4 sentence personalized advisory paragraph for the citizen's report card. 
Point out any combined risks (e.g. overweight combined with high BP, or diabetic history with high sugar levels) and state clear, actionable preventative/corrective lifestyle guidelines.
Do not write an introduction or list format. Write it as a single cohesive paragraph.

${patientStats}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const advisoryText = response.text().trim();

    res.status(200).json({
      success: true,
      advisory: advisoryText,
      isFallback: false
    });
  } catch (error) {
    console.error('Gemini Advisory Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate advisory. ' + error.message
    });
  }
};
