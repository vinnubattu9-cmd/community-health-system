const mongoose = require('mongoose');

const SurveySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be positive'],
    max: [120, 'Age must be less than 120']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [30, 'Height must be at least 30 cm'],
    max: [300, 'Height must be less than 300 cm']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [2, 'Weight must be at least 2 kg'],
    max: [500, 'Weight must be less than 500 kg']
  },
  temperature: {
    type: Number,
    required: [true, 'Temperature is required'],
    min: [30, 'Temperature is too low'],
    max: [45, 'Temperature is too high']
  },
  pulseRate: {
    type: Number,
    required: [true, 'Pulse rate is required'],
    min: [20, 'Pulse rate is too low'],
    max: [250, 'Pulse rate is too high']
  },
  oxygenLevel: {
    type: Number,
    required: [true, 'Oxygen level is required'],
    min: [50, 'Oxygen level is too low'],
    max: [100, 'Oxygen level cannot exceed 100%']
  },
  bloodPressureSystolic: {
    type: Number,
    required: [true, 'Systolic blood pressure is required'],
    min: [50, 'Systolic pressure is too low'],
    max: [250, 'Systolic pressure is too high']
  },
  bloodPressureDiastolic: {
    type: Number,
    required: [true, 'Diastolic blood pressure is required'],
    min: [30, 'Diastolic pressure is too low'],
    max: [150, 'Diastolic pressure is too high']
  },
  bloodSugar: {
    type: Number,
    required: [true, 'Blood sugar level is required'],
    min: [20, 'Blood sugar level is too low'],
    max: [1000, 'Blood sugar level is too high']
  },
  bmi: {
    type: Number,
    required: true
  },
  bmiCategory: {
    type: String,
    required: true,
    enum: ['Underweight', 'Healthy', 'Overweight', 'Obese']
  },
  status: {
    type: String,
    required: true,
    enum: ['Healthy', 'Needs Improvement', 'At Risk']
  },
  recommendations: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Survey', SurveySchema);
