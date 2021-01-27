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
