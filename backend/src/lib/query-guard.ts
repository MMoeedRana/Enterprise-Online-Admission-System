import mongoose from 'mongoose';

export const QUERY_TIME_LIMIT_MS = 30_000;

const READS = ['find', 'findOne', 'countDocuments', 'distinct'] as const;

mongoose.plugin((schema) => {
  schema.pre(READS as unknown as 'find', function () {
    if (this.getOptions().maxTimeMS === undefined) this.maxTimeMS(QUERY_TIME_LIMIT_MS);
  });
  schema.pre('aggregate', function () {
    if (this.options.maxTimeMS === undefined) this.option({ maxTimeMS: QUERY_TIME_LIMIT_MS });
  });
});
