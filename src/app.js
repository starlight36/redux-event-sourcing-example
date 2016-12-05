import Koa from 'koa';
import uuid from 'uuid/v4';
import Product from './domain/model/product';

const app = new Koa();

app.use(async ctx => {
  try {
    const product = await Product.load('a1bbff84-8c93-41ee-8ff0-52f2ce852579');
    await product.lockStock(uuid(), 50);
    ctx.body = product.store.getState();
  } catch (err) {
    ctx.body = { error: 'OptimisticLockFailed', message: err.message };
  }
});

app.listen(3000);
