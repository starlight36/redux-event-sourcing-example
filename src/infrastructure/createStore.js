import { createStore, applyMiddleware } from 'redux';

const logger = store => next => action => {
  console.info('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState());
  return result
};

const vanillaPromise = store => next => action => {
  if (typeof action.then !== 'function') {
    return next(action);
  }

  return Promise.resolve(action).then(store.dispatch);
};

const thunk = store => next => action =>
  typeof action === 'function' ?
    action(store.dispatch, store.getState) :
    next(action);

export default config => {
  // defaults
  const serializer = config.serialize === false ? (data) => data : JSON.stringify;
  const deserializer = config.serialize === false ? (data) => data : JSON.parse;
  const storage = config.storage;

  return (key, reducer, initialState) => {
    let recordAction = false;

    const enhancer = applyMiddleware(
      thunk,
      vanillaPromise,
      store => next => action => {
        return recordAction ? storage.append(key, store.getState().version, serializer(action))
          .then(() => next(action))
          : next(action);
      },
      logger,
    );

    const versionReducer = (state, action) =>
      reducer({...state, version: (state.version || 0) + 1}, action);

    return storage.loadSnapshot(key)
      .then(snapshot => ({
        ...initialState,
        ...(snapshot ? deserializer(snapshot) : {}),
      }))
      .then(initialState => ({
        initialState,
        store: createStore(versionReducer, initialState, enhancer),
      }))
      .then(context => storage.load(key, context.initialState.version)
        .then(actions => actions.map(action => deserializer(action)))
        .then(actions => (actions || [])
          .reduce(
            (all, action) => all.then(() => context.store.dispatch(action)),
            Promise.resolve()
          )
          .then(() => (recordAction = true, context.store))));
  };
}
