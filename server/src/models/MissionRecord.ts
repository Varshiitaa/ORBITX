import mongoose, { Schema } from 'mongoose'

const MissionRecordSchema = new Schema(
  {
    _id: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
)

export const MissionRecord =
  mongoose.models.MissionRecord || mongoose.model('MissionRecord', MissionRecordSchema)
