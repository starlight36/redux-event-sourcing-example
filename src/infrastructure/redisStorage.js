export default function redisStorage(redis) {
  redis.defineCommand('append', {
    numberOfKeys: 0,
    lua: `if tonumber(redis.call('zrange', ARGV[1], '-1', '-1', 'WITHSCORES')[2]) + 1 == tonumber(ARGV[2]) then return redis.call('zadd', ARGV[1], ARGV[2], ARGV[3]) else return 0 end`
  });
  return {
    loadSnapshot: key => {
      return redis.get(`${key}:snapshot`);
    },

    load: (key, skipVersion) => redis
      .zrangebyscore(`${key}:actions`, `${skipVersion ? skipVersion + 1: '-inf'}`, '+inf'),

    append: (key, expectedVersion, action) => {
      return redis.append(`${key}:actions`, expectedVersion, action)
        .then(result => result === 0 ? Promise.reject(new Error('Expired!')) : 'OK');
    },
  };
};
