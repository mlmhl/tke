import * as React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { ContentView, Justify } from '@tencent/tea-component';

import { cloneDeep, isEmpty } from '../../../common/utils';
import { allActions } from '../../actions';
import { SubRouter } from '../../models';
import { router } from '../../router';
import { RootProps } from '../ClusterApp';
import { ClusterDetailPanel } from './clusterInfomation/ClusterDetail';
import { BatchDrainComputerDialog } from './nodeManage/BatchDrainComputerDialog';
import { ComputerActionPanel } from './nodeManage/ComputerActionPanel';
import { ComputerTablePanel } from './nodeManage/ComputerTablePanel';
import { UpdateNodeLabelDialog } from './nodeManage/UpdateNodeLabelDialog';
import { ResourceSidebarPanel } from './ResourceSidebarPanel';
import { ResourceActionPanel } from './resourceTableOperation/ResourceActionPanel';
import { ResourceDeleteDialog } from './resourceTableOperation/ResourceDeleteDialog';
import { ResourceEventPanel } from './resourceTableOperation/ResourceEventPanel';
import { ResourceLogPanel } from './resourceTableOperation/ResourceLogPanel';
import { ResourceTablePanel } from './resourceTableOperation/ResourceTablePanel';
import { AreaMap } from '../../constants/Config';

const loadingElement: JSX.Element = (
  <div>
    <i className="n-loading-icon" />
    &nbsp; <span className="text">{t('加载中...')}</span>
  </div>
);

export interface ResourceListPanelProps extends RootProps {
  /** subRouterList */
  subRouterList: SubRouter[];
}

const mapDispatchToProps = dispatch =>
  Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
export class ResourceListPanel extends React.Component<ResourceListPanelProps, {}> {
  render() {
    let { subRoot, route, namespaceList, subRouterList } = this.props,
      urlParams = router.resolve(route),
      { resourceInfo } = subRoot;

    /** namespace filter的逻辑数据 */
    const { rawProjectList = [], projectSelection } = this.props;
    let newAreaMap = cloneDeep(AreaMap);
    if (projectSelection && WEBPACK_CONFIG_SHARED_CLUSTER) {
      const selectedProject = rawProjectList.filter(item => item.metadata.name === projectSelection)[0];
      const { spec = {}} = selectedProject || {};
      const { zones = [] } = spec || {};
      zones.forEach(item => {
        // zone的格式为：ap-nanjing-1
        const zone = item.zone;
        const [prefix, area, number] = zone.split('-');
        item.value = zone;
        item.text = AreaMap[area] ? AreaMap[area].text + number + '区' : '';
        const zoneMap = newAreaMap[area]['zone'] || {};
        zoneMap[zone] = item;
        newAreaMap[area]['zoneMap'] = zoneMap;
      });
    }

    let content: JSX.Element;
    let headTitle: string = '';
    let resource = urlParams['resourceName'];
    // 判断应该展示什么组件
    switch (resource) {
      case 'info':
        content = <ClusterDetailPanel {...this.props} />;
        headTitle = t('基础信息');
        break;

      case 'log':
        content = <ResourceLogPanel />;
        headTitle = t('日志');
        break;

      case 'event':
        content = <ResourceEventPanel />;
        headTitle = t('事件');
        break;
      default:
        content = isEmpty(resourceInfo) ? (
          loadingElement
        ) : (
          <React.Fragment>
            <ResourceActionPanel newAreaMap={newAreaMap} />
            <ResourceTablePanel newAreaMap={newAreaMap} />
          </React.Fragment>
        );
        headTitle = resourceInfo.headTitle;
        break;
    }

    return (
      <React.Fragment>
        <ContentView>
          <ContentView.Body sidebar={<ResourceSidebarPanel subRouterList={subRouterList} />}>
            {namespaceList.fetched ? (
              <ContentView>
                <ContentView.Header>
                  <Justify left={<h2 className="tea-h2">{headTitle || ''}</h2>} />
                </ContentView.Header>
                <ContentView.Body>{content}</ContentView.Body>
              </ContentView>
            ) : (
              <ContentView>
                <ContentView.Body>
                  <div style={{ marginTop: '20px' }}>
                    <i className="n-loading-icon" />
                    &nbsp; <span className="text">加载中...</span>
                  </div>
                </ContentView.Body>
              </ContentView>
            )}
          </ContentView.Body>
        </ContentView>
        <ResourceDeleteDialog />
      </React.Fragment>
    );
  }
}
