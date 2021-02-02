import * as React from 'react';
import { connect, Provider } from 'react-redux';

import { cloneDeep, isEmpty } from '@src/modules/common';
import { bindActionCreators } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';

import { ResetStoreAction } from '../../../../helpers';
import { allActions } from '../actions';
import { RootState, SubRouter } from '../models';
import { router } from '../router';
import { configStore } from '../stores/RootStore';
import { ApplicationHeadPanel } from './ApplicationHeadPanel.project';
import { ResourceDetail } from './resource/resourceDetail/ResourceDetail';
import { EditResourcePanel } from './resource/resourceEdition/EditResourcePanel';
import { UpdateResourcePanel } from './resource/resourceEdition/UpdateResourcePanel';
import { ResourceListPanel } from './resource/ResourceListPanel';

const store = configStore();

export class ApplicationAppContainer extends React.Component<any, any> {
  // 页面离开时，清空store
  componentWillUnmount() {
    store.dispatch({ type: ResetStoreAction });
  }

  render() {
    return (
      <Provider store={store}>
        <ApplicationApp {...this.props} />
      </Provider>
    );
  }
}

interface ApplicationListPanelState {
  /** 菜单栏列表 */
  finalSubRouterList?: SubRouter[];
  ifSetUserInfo?: boolean;
  ifSetPortalInfo?: boolean;
}
export interface RootProps extends RootState {
  actions?: typeof allActions;
  wrapperPortal?: any;
  wrapperUserInfo?: any;
  projects?: any;
}

const mapDispatchToProps = dispatch =>
  Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
@((router.serve as any)())
class ApplicationApp extends React.Component<RootProps, {}> {
  render() {
    return <ApplicationList {...this.props} />;
  }
}

class ApplicationList extends React.Component<RootProps, ApplicationListPanelState> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      finalSubRouterList: [],
      ifSetUserInfo: false,
      ifSetPortalInfo: false
    };
  }
  componentDidMount() {
    let { actions, route, subRoot } = this.props,
      { subRouterList } = subRoot,
      urlParams = router.resolve(route);

    // 这里去拉取侧边栏的配置，侧边路由
    !subRouterList.fetched && actions.subRouter.applyFilter({});
    actions.region.fetch();
    // 这里需要去判断一下当前的resource是否需要进行namespace 路由的更新，参考resourceTabelPanel
    let { resourceName: resource, type: resourceType } = urlParams;
    resource ? actions.resource.initResourceName(resource) : actions.resource.initResourceName('np');
    // 判断当前是否需要去更新np的路由
    let isNeedFetchNamespace =
      resourceType === 'resource' || resourceType === 'service' || resourceType === 'config' || resource === 'pvc' || resource === 'csi';
    actions.resource.toggleIsNeedFetchNamespace(isNeedFetchNamespace ? true : false);
    // actions.projectNamespace.initProjectList();

    // 获取用户信息并存储在redux中
    // actions.user.fetch();
  }

  componentWillReceiveProps(nextProps: RootProps) {
    const { ifSetPortalInfo, ifSetUserInfo } = this.state;
    let { route, actions, namespaceSelection, subRoot, rawProjectList, userInfo, wrapperUserInfo, wrapperPortal } = nextProps,
      newUrlParam = router.resolve(route),
      { mode, subRouterList, addons } = subRoot;

    // 如果rawProjectList为空 && Wrapper中传过来的wrapperPortal不为空 && 没有执行过这个if逻辑则执行（保证这个逻辑只执行1次）
    if (isEmpty(rawProjectList) && !isEmpty(wrapperPortal) && ifSetPortalInfo === false) {
      actions.projectNamespace.initProjectList(wrapperPortal);
      this.setState({ ifSetPortalInfo: true });
    }

    // 如果userInfo.object.data为空 && Wrapper中传过来的wrapperUserInfo.name不为空 && 没有执行过这个if逻辑则执行（保证这个逻辑只执行1次
    if (isEmpty(userInfo.object.data) && wrapperUserInfo.name && ifSetUserInfo === false) {
      // actions.user.fetch();
      actions.user.fetch({ data: wrapperUserInfo });
      this.setState({ ifSetUserInfo: true });
    }

    let newMode = newUrlParam['mode'];
    const resourceName = newUrlParam['resourceName'];
    const projectName = route.queries['projectName'];
    let oldMode = this.props.subRoot.mode;
    if (newMode !== '' && oldMode !== newMode && newMode !== mode) {
      actions.resource.selectMode(newMode);
      // 这里是判断回退动作，取消动作等的时候，回到list页面，需要重新拉取一下，激活一下轮训的状态等
      newMode === 'list' &&
        resourceName === 'np' &&
        actions.projectNamespace.applyFilter({ specificName: projectName });
      newMode === 'list' && actions.resource.poll();
    }

    /** =================== 这里是判断二级菜单路由的配置 ====================== */
    // 判断路由是否拉取完毕
    if (subRouterList.fetched && this.props.subRoot.subRouterList.fetched !== subRouterList.fetched) {
      this.setState({
        finalSubRouterList: subRouterList.data.records
      });
    }

    if (Object.keys(addons).length !== 0 && Object.keys(this.props.subRoot.addons).length === 0) {
      let addonRouterConfig: {
        [props: string]: { routerIndex: number; routerConfig: { name: string; path: string } };
      } = {
        lbcf: {
          routerIndex: 0,
          routerConfig: {
            name: t('负载均衡3'),
            path: 'lbcf'
          }
        },
        tapp: {
          routerIndex: 0,
          routerConfig: {
            name: t('TApp'),
            path: 'tapp'
          }
        }
      };
      let newRouterList: SubRouter[] = cloneDeep(this.state.finalSubRouterList);
      newRouterList.forEach((item, index) => {
        if (item.path === 'service') {
          addonRouterConfig['lbcf'].routerIndex = index;
        } else if (item.path === 'resource') {
          addonRouterConfig['tapp'].routerIndex = index;
        }
      });

      /**
       * 隐藏负载均衡.
       * @see {@link http://tapd.oa.com/TKEx_TEG/prong/stories/view/1020426652861983539}
       */
      let keys = Object.keys(addons).filter(key => key !== 'LBCF');

      keys.forEach(key => {
        if (key === 'LBCF') {
          let lbcfConfig = addonRouterConfig['lbcf'];
          newRouterList[lbcfConfig.routerIndex].sub.push(lbcfConfig.routerConfig);
        } else if (key === 'TappController') {
          let tappConfig = addonRouterConfig['tapp'];
          newRouterList[tappConfig.routerIndex].sub.push(tappConfig.routerConfig);
        }
      });
      this.setState({ finalSubRouterList: newRouterList });
    }
    /** =================== 这里是判断二级菜单路由的配置 ====================== */
  }

  render() {
    let { route, subRoot } = this.props,
      urlParams = router.resolve(route);
    let urlMode = urlParams['mode'];
    if (!urlMode || urlMode === 'list') {
      return (
        <div className="manage-area manage-area-secondary">
          <ApplicationHeadPanel />
          <ResourceListPanel subRouterList={this.state.finalSubRouterList} />
        </div>
      );
    } else if (urlMode === 'detail') {
      return <ResourceDetail />;
    } else if (urlMode === 'create' || urlMode === 'modify' || urlMode === 'modify-namespace') {
      return <EditResourcePanel {...this.props} />;
    } else if (urlMode === 'update') {
      return <UpdateResourcePanel />;
    }
  }
}
