const mongoose = require('mongoose');

const topicScoreSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  correct: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: { type: String, required: true, trim: true },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    topicScores: [topicScoreSchema],
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Virtual: accuracy percentage
quizAttemptSchema.virtual('accuracy').get(function () {
  if (!this.totalQuestions) return 0;
  return Math.round((this.correctAnswers / this.totalQuestions) * 100);
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
