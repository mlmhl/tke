import * as React from 'react';
import { connect } from 'react-redux';

import { FormPanel } from '@tencent/ff-component';
import { bindActionCreators } from '@tencent/ff-redux';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { Select, Switch, InputAdornment, InputNumber, Button, Text } from '@tencent/tea-component';

import { FormItem, LinkButton } from '../../../../common';
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
            { networkType, floatingIPReleasePolicy, isNatOn } = workloadEdit;

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
                        if (networkType !== WorkloadNetworkTypeEnum.Overlay) {
                          actions.editWorkload.isNatOn(false);
                        }
                    }}
            />
            <p className="text-label">{t('Global Route：VPC内私有IP，无法从集群外访问，不可以注册到CMDB或绑定CLB。开启随机端口映射后可从集群外访问，并可绑定北极星。')}</p>
            <p className="text-label">{t('ENI IP：公司内可路由IP，可从集群外访问，可以注册CMDB、CLB和北极星。')}</p>
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
          <FormItem isShow={networkType === WorkloadNetworkTypeEnum.Overlay} label={t('随机端口映射')}>
            <Switch
              onChange={value => {
                actions.editWorkload.isNatOn(value);
              }}
            >
              <Trans>开启</Trans>
            </Switch>
            <Text parent="p" theme="label" style={{ marginTop: '8px' }}>
              开启后，会在母机上分配随机端口映射到容器内端口。如果注册到北极星，则服务器地址为母机IP和端口
            </Text>
            <FormItem isShow={isNatOn} label={t('容器内端口')}>
              {this._renderNatPortList()}
              <div>
                <Button
                  type="link"
                  style={{ marginRight: 5 }}
                  onClick={() => {
                    actions.editWorkload.addNatPorts();
                  }}
                >
                  新增一个
                </Button>
              </div>
            </FormItem>
          </FormItem>
          {/* <FormItem label={t('端口')} isShow={isShowPort}>
        </FormItem> */}
        </React.Fragment>);
    }

    private _renderNatPortList() {
      let { actions, subRoot } = this.props,
        { workloadEdit } = subRoot,
        { natPorts } = workloadEdit;

      return natPorts.map((port, index) => {
        let onlyOneLeft = index === 0;
        return (
          <div key={index} style={{ marginBottom: '5px' }}>
            <div style={{ display: 'inline-block' }} >
              <Select
                options={['TCP', 'UDP'].map(value => ({ value }))}
                defaultValue={t('TCP')}
                style={{ width: 'auto' }}
                value={port.containerPortProtocol}
                onChange={e => actions.editWorkload.updateNatPorts({ containerPortProtocol: e }, port.id + '')}
              />
              <InputNumber
                defaultValue={1}
                min={1}
                value={port.containerPort}
                onChange={e => actions.editWorkload.updateNatPorts({ containerPort: e }, port.id + '')}
              />
              <span className="inline-help-text">
                <LinkButton
                  errorTip={t('至少填写1个端口')}
                  disabled={onlyOneLeft}
                  onClick={() => actions.editWorkload.deleteNatPorts(port.id + '')}
                >
                  <i className="icon-cancel-icon" />
                </LinkButton>
              </span>
            </div>
          </div>
        );
      });
    }
}
