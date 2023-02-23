const _ = require('lodash');
const userModel = require('../models/user.mode');
const orgModel = require('../models/org.mode');

const { ROLE } = require('@serverless-cd/config');
const { NoPermissionError, ValidationError } = require('../util');

async function getUserById(userId = '') {
  const data = await userModel.getUserById(userId);
  if (_.isNil(data)) {
    return {};
  }
  return data;
}

async function updateUserById(userId, data) {
  return await userModel.updateUserById(userId, data);
}

/**
 * 根据团队Id拿到拥有者用户数据
 */
async function getOrganizationOwnerIdByOrgId(orgId) {
  let ownerUserId = '';
  // 当前用户在此团队的数据
  const orgData = await orgModel.getOrgById(orgId);
  const { role, name = '' } = orgData || {};
  if (role === ROLE.OWNER) {
    ownerUserId = orgData.user_id;
  } else {
    const ownerOrgData = await orgModel.getOwnerOrgByName(name);
    ownerUserId = ownerOrgData.user_id;
  }

  // 此团队拥有者的数据：一个团队只能拥有一个 owner
  return await getUserById(ownerUserId);
}

/**
 * 根据团队Id获取拥有者用户Token
 */
async function getProviderToken(orgId, userId, provider) {
  const userInfo = await getOrganizationOwnerIdByOrgId(orgId);
  const token = _.get(userInfo, `third_part.${provider}.access_token`, '');
  if (!token) {
    if (_.get(userInfo, 'id', '') === userId) {
      throw new ValidationError(`${provider} 授权令牌不存在，请重新授权`);
    }
    throw new NoPermissionError(`没有找到 ${provider}.access_token`);
  }

  return token;
}

function desensitization(data) {
  if (_.isArray(data)) {
    return _.map(data, item => {
      const third_part = _.get(data, 'third_part', {});
      _.merge(item, {
        isAuth: !!_.get(third_part, 'github.access_token', false),
        github_name: _.get(third_part, 'github.owner', ''),
      });
      return _.omit(item, ['third_part', 'password', 'secrets'])
    })
  }
  const third_part = _.get(data, 'third_part', {});
  _.merge(data, {
    isAuth: !!_.get(third_part, 'github.access_token', false),
    github_name: _.get(third_part, 'github.owner', ''),
  });
  return _.omit(data, ['third_part', 'password', 'secrets']);
}


module.exports = {
  desensitization,
  getUserById,
  updateUserById,
  getProviderToken,
  getOrganizationOwnerIdByOrgId,
};