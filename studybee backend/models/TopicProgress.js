const mongoose = require('mongoose');

const topicProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    topic: { type: String, required: true, trim: true, index: true },
    attempts: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    lastStudiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index: one doc per user+topic
topicProgressSchema.index({ userId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('TopicProgress', topicProgressSchema);
