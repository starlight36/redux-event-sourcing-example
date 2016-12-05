import Redis from 'ioredis';
import createStore from '../../infrastructure/createStore';
import redisStorage from '../../infrastructure/redisStorage';
import uuid from 'uuid/v4';

const storage = redisStorage(new Redis());
const storeCreator = createStore({
  storage,
});

const initialState = {
  stock: 0,
  lockedStock: {},
};

const productReducer = (state = initialState, action) => {
  if (action.type === 'CREATE_PRODUCT') {
    return {
      ...state,
      ...action.payload
    }
  } else if (action.type === 'LOCK_STOCK_FOR_SELL') {
    const lockedStock = {
      ...state.lockedStock,
    };
    lockedStock[action.payload.orderId] = action.payload.amount;
    return {
      ...state,
      stock: state.stock - action.payload.amount,
      lockedStock,
    }
  }

  return state;
};

export const DOMAIN_TYPE = 'product';

export default class Product {

  static create(object) {
    const instance = new Product();
    return storeCreator(`${DOMAIN_TYPE}:${uuid()}`, productReducer, initialState)
      .then(store => instance.store = store)
      .then(() => instance.when({ type: 'CREATE_PRODUCT', payload: object }))
      .then(() => instance);
  }

  static load(id) {
    const instance = new Product();
    return storeCreator(`${DOMAIN_TYPE}:${id}`, productReducer, initialState)
      .then(store => instance.store = store)
      .then(() => instance);
  }

  when(action) {
    return Promise.resolve(this.store.dispatch(action));
  }

  lockStock(orderId, amount) {
    if (this.store.getState().stock < amount) {
      throw new Error('库存不足。');
    }
    return this.when({
      type: 'LOCK_STOCK_FOR_SELL',
      payload: {
        orderId,
        amount,
      },
    });
  }
}
