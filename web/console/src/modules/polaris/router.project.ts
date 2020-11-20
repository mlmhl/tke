import { Router } from '../../../helpers/Router';

/**
 * @param mode  当前的展示内容类型 list | create | update | detail
 */
export const router = new Router('/tkestack-project/polaris(/:mode)', { mode: '' });
