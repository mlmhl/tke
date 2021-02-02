import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { bindActionCreators } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Select } from '@tencent/tea-component';

import { FormItem } from '../../../../common';
import { allActions } from '../../../actions';
import {
    FloatingIPReleasePolicy,
    WorkloadNetworkType,
    SharedClusterWorkloadNetworkType,
    WorkloadNetworkTypeEnum,
} from '../../../constants/Config';
import { RootProps } from '../../ClusterApp';

const mapDispatchToProps = dispatch =>
    Object.assign({}, bindActionCreators({ actions: allActions }, dispatch), { dispatch });

@connect(state => state, mapDispatchToProps)
export class EditResourceNetworkTypePanel extends React.Component<RootProps, {}> {
    render() {
        let { subRoot, actions } = this.props,
            { workloadEdit } = subRoot,
            { networkType, floatingIPReleasePolicy } = workloadEdit;

        let networkTypeOptions = WorkloadNetworkType;
        if (WEBPACK_CONFIG_SHARED_CLUSTER) {
            networkTypeOptions = SharedClusterWorkloadNetworkType;
        }

        return (<React.Fragment>
          <FormItem label={t('网络模式')}>
            <Select
              size="m"
              options={networkTypeOptions}
              value={networkType}
              onChange={value => {
                        actions.editWorkload.selectNetworkType(value);
                    }}
            />
            <p className="text-label">{t('Global Route：VPC内私有IP，无法从集群外访问，不可以注册到CMDB或绑定CLB，但可以绑定北极星。绑定北极星时，注册的IP依然是VPC内IP，无法从集群外访问。')}</p>
            <p className="text-label">{t('ENI IP：公司内可路由IP，可从集群外访问，可以注册到CMDB，可以绑定CLB、北极星。')}</p>
            <p className="text-label">{t('NAT：母机上会自动创建随机端口映射至容器内端口，不可以注册到CMDB或绑定CLB，但可以绑定北极星。绑定北极星时，注册的地址是母机IP和端口，可以从集群外访问。')}</p>
          </FormItem>
          <FormItem isShow={networkType === WorkloadNetworkTypeEnum.FloatingIP} label={t('IP回收策略')}>
            <FormPanel.Select
              size="m"
              options={FloatingIPReleasePolicy}
              value={floatingIPReleasePolicy}
              onChange={value => {
                        actions.editWorkload.selectFloatingIPReleasePolicy(value);
                    }}
                ></FormPanel.Select>
          </FormItem>
          {/* <FormItem label={t('端口')} isShow={isShowPort}>
        </FormItem> */}
        </React.Fragment>);
    }
}
