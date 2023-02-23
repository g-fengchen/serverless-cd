const router = require('express').Router();
const _ = require('lodash');
const { Result, NeedLogin } = require('../../util');
const { OWNER_ROLE_KEYS } = require('@serverless-cd/config');
const auth = require('../../middleware/auth');
const userService = require('../../services/user.service');
const orgService = require('../../services/org.service');

/**
 * 用户信息
 */
router.get('/info', async function (req, res) {
  const { userId } = req;
  const result = await userService.getUserById(userId);
  if (!result.id) {
    throw new NeedLogin('用户信息异常');
  }

  const listOrgs = await orgService.listByUserId(userId)
  const userInfo = {
    ...userService.desensitization(result),
    listOrgs: orgService.desensitization(listOrgs),
  };

  return res.json(Result.ofSuccess(userInfo));
});

/**
 * 绑定 github token
 */
router.put('/token', auth(OWNER_ROLE_KEYS), async function (req, res) {
  const { userId } = req;
  const data = await userService.getUserById(userId);
  const access_token = _.get(req, 'body.data.token', '');
  const provider = _.get(req, 'body.data.provider', '');
  _.set(data, `third_part.${provider}.access_token`, access_token);

  await userService.updateUserById(userId, data);
  return res.json(Result.ofSuccess());
});

/**
 * 显示个人所有的团队
 */
router.get('/listOrgs', async (req, res) => {
  const { userId } = req;
  const result = await orgService.listByUserId(userId);
  res.json(Result.ofSuccess(orgService.desensitization(result)));
});

module.exports = router;