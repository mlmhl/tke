import { t, Trans } from '@tencent/tea-app/lib/i18n';

export const VALIDATE_PASSWORD_RULE = {
  pattern: /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*-_=+]{10,16}$/,
  message: t('长10~16位，需包括大小写字母及数字')
};

export const VALIDATE_PHONE_RULE = {
  pattern: /^1[3|4|5|7|8][0-9]{9}$/,
  message: t('请输入正确的手机号')
};

export const VALIDATE_EMAIL_RULE = {
  pattern: /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
  message: t('请输入正确的邮箱')
};

export const VALIDATE_NAME_RULE = {
  //   pattern: /^[a-z]([-a-z0-9]{0,18}[a-z0-9])?$/,
  //   message: t('长1~20位，需以小写字母开始，小写字母或数字结尾，包含小写字母、数字、-')
  pattern: /^[a-z0-9][-a-z0-9]{1,30}[a-z0-9]$/,
  message: t('长3~32位，需以小写字母或数字开头结尾，中间包含小写字母、数字、-')
};

export const STRATEGY_TYPE = ['自定义策略', '预设策略'];

export const TabType = {
  platform: 'platform',
  business: 'business',
  realProject: 'real-project'
};
