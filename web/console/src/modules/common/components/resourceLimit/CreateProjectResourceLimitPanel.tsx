/**
 * 资源限制
 */
import * as React from 'react';
import { K8SUNIT, valueLabels1000, valueLabels1024 } from '@helper/k8sUnitUtil';
import { deepClone, Identifiable, uuid } from '@tencent/ff-redux';
import { t } from '@tencent/tea-app/lib/i18n';
import { Alert, Bubble, Button, Col, Input, InputAdorment, Row, Select } from '@tencent/tea-component';
import { LinkButton } from '../index';
import { Validation, initValidator } from '../../models';

export const ResourceLimitType = {
  AMD_CPU: 'requests.teg.tkex.oa.com/amd-cpu',
  INTEL_CPU: 'requests.teg.tkex.oa.com/intel-cpu',
};

export const resourceLimitTypeList = [
  {
    text: t('Pod数目'),
    value: 'pods'
  },
  {
    text: t('Services数目'),
    value: 'services'
  },
  {
    text: t('quotas'),
    value: 'resourcequotas'
  },
  {
    text: t('Secrets数目'),
    value: 'secrets'
  },
  {
    text: t('Configmaps数目'),
    value: 'configmaps'
  },
  {
    text: t('PVC数目'),
    value: 'persistentvolumeclaims'
  },
  {
    text: t('nodeports模式服务数目'),
    value: 'services.nodeports'
  },
  {
    text: t('LB模式服务数目'),
    value: 'services.loadbalancers'
  },
  {
    text: t('Mem Request'),
    value: 'requests.memory'
  },
  {
    text: t('Local ephemeral storage request'),
    value: 'requests.ephemeral-storage'
  },
  {
    text: t('AMD CPU Request'),
    value: ResourceLimitType.AMD_CPU
  },
  {
    text: t('INTEL CPU Request'),
    value: ResourceLimitType.INTEL_CPU
  }
];

export const resourceTypeToUnit = {
  pods: t('个'),
  services: t('个'),
  resourcequotas: t('个'),
  secrets: t('个'),
  configmaps: t('个'),
  persistentvolumeclaims: t('个'),
  'services.nodeports': t('个'),
  'services.loadbalancers': t('个'),
  'requests.memory': 'MiB',
  'requests.ephemeral-storage': 'MiB',
  [ResourceLimitType.AMD_CPU]: t('毫核'),
  [ResourceLimitType.INTEL_CPU]: t('毫核')
};

export const initProjectResourceLimit = {
  type: ResourceLimitType.AMD_CPU,
  value: '',
  v_type: initValidator,
  v_value: initValidator
};


// import { LinkButton } from '../../common/components';
// import { initProjectResourceLimit, resourceLimitTypeList, resourceTypeToUnit } from '../constants/Config';
// import { ProjectResourceLimit } from '../models/Project';

export interface ProjectResourceLimit extends Identifiable {
  type: string;
  v_type: Validation;
  value: string;
  v_value: Validation;
}

export interface CreateProjectResourceLimitPanelPorps {
  resourceLimits: ProjectResourceLimit[];
  parentResourceLimits: {
    [props: string]: string;
  };
  failMessage?: string;
  onCancel: () => void;
  onSubmit: (resourceLimits: ProjectResourceLimit[]) => void;
}

export class CreateProjectResourceLimitPanel extends React.Component<
  CreateProjectResourceLimitPanelPorps,
  { resourceLimits: ProjectResourceLimit[]; parentResourceMaxLimit: { [props: string]: string } }
  > {
  constructor(props, context) {
    super(props, context);
    let { parentResourceLimits, resourceLimits } = this.props;
    console.log('parentResourceLimits, resourceLimits ', parentResourceLimits, resourceLimits);
    let initResourceLimits =
      parentResourceLimits && Object.keys(parentResourceLimits).length
        ? Object.keys(parentResourceLimits).map(item =>
          Object.assign({}, initProjectResourceLimit, { id: uuid(), type: item })
        )
        : ([Object.assign({}, initProjectResourceLimit, { id: uuid() })] as ProjectResourceLimit[]);
    let parentResourceMaxLimit = {};
    if (parentResourceLimits) {
      Object.keys(parentResourceLimits).forEach(type => {
        let maxLimit = parentResourceLimits[type]
          ? resourceTypeToUnit[type] === 'MiB'
            ? valueLabels1024(parentResourceLimits[type], K8SUNIT.Mi)
            : valueLabels1000(parentResourceLimits[type], K8SUNIT.unit)
          : null;
        parentResourceMaxLimit[type] = maxLimit;
      });
    }
    /**转换单位为k的数值 */
    if (resourceLimits) {
      resourceLimits = resourceLimits.map(item => {
        if (item.type === ResourceLimitType.AMD_CPU || item.type === ResourceLimitType.INTEL_CPU) {
          if (item.value.endsWith('k')) {
            item.value = String(parseFloat(item.value) * 1000);
          }
        }
        return item;
      });
    }
    this.state = {
      resourceLimits: resourceLimits && resourceLimits.length ? resourceLimits : initResourceLimits,
      parentResourceMaxLimit: parentResourceMaxLimit
    };
  }

  addLimit() {
    let { resourceLimits } = this.state;
    let newResourceLimits = deepClone(resourceLimits);
    let newItemKey;
    for (let item of resourceLimitTypeList) {
      if (newResourceLimits.findIndex(limit => limit.type === item.value) === -1) {
        newItemKey = item.value;
        break;
      }
    }
    let item = Object.assign({}, initProjectResourceLimit, { id: uuid(), type: newItemKey });
    newResourceLimits.push(item);

    this.setState({ resourceLimits: newResourceLimits });
  }

  deleteLimit(id: string) {
    let { resourceLimits } = this.state;
    let newResourceLimits = deepClone(resourceLimits);
    let limitIndex = newResourceLimits.findIndex(item => item.id === id);
    limitIndex !== -1 && newResourceLimits.splice(limitIndex, 1);
    this.setState({ resourceLimits: newResourceLimits });
  }

  inputLimitValue(id: string, value: string) {
    let { resourceLimits } = this.state;
    let newResourceLimits = deepClone(resourceLimits);
    let finder = newResourceLimits.find(item => item.id === id);
    finder.value = value;
    this.setState({ resourceLimits: newResourceLimits });
  }

  inputLimitType(id: string, type: string) {
    let { resourceLimits } = this.state;
    let newResourceLimits = deepClone(resourceLimits);
    let finder = newResourceLimits.find(item => item.id === id);
    finder.type = type;
    this.setState({ resourceLimits: newResourceLimits });

    this.validateProjectResourceLimitType(id, type);
  }

  validateProjectResourceLimitType(id: string, type: string) {
    let self = this;
    setTimeout(() => {
      let { resourceLimits } = self.state;
      let newResourceLimits = deepClone(resourceLimits);
      let finder = newResourceLimits.find(item => item.id === id);
      finder.v_type = self._validateProjectResourceLimitType(type, resourceLimits);

      self.setState({ resourceLimits: newResourceLimits });
    });
  }

  _validateProjectResourceLimitType(type: string, resourceLimits: ProjectResourceLimit[]) {
    let filter = resourceLimits.filter(item => item.type === type);
    let status = 0,
      message = '';
    if (filter.length > 1) {
      status = 2;
      message = '限制不能重复填写';
    } else {
      status = 1;
      message = '';
    }
    return { status, message };
  }

  validateLimitValue(id: string, value: string, type: string) {
    let { resourceLimits, parentResourceMaxLimit } = this.state;
    let newResourceLimits = deepClone(resourceLimits);
    let finder = newResourceLimits.find(item => item.id === id);
    finder.v_value = this._validateMemLimit(value, +parentResourceMaxLimit[type]);
    this.setState({ resourceLimits: newResourceLimits });
  }

  /** 校验容器 CPU限制 */
  _validateCpuLimit(cpu: string, max: number) {
    let reg = /^\d+(\.\d{1,2})?$/,
      status = 0,
      message = '';

    // 验证CPU限制
    if (cpu === '') {
      status = 2;
      message = t('数值不能为空');
    } else if (isNaN(+cpu)) {
      status = 2;
      message = t('数据格式不正确，CPU限制只能是小数，且只能精确到0.01');
    } else if (!reg.test(cpu)) {
      status = 2;
      message = t('数据格式不正确，CPU限制只能是小数，且只能精确到0.01');
    } else if (+cpu < 0.01) {
      status = 2;
      message = t('CPU限制最小为0.01');
    } else if (max && +cpu > max) {
      status = 2;
      message = t('CPU限制不能大于上级业务的CPU限制');
    } else {
      status = 1;
      message = '';
    }

    return { status, message };
  }

  /** 校验容器 mem限制 */
  _validateMemLimit(mem: string, max: number) {
    let reg = /^\d+?$/,
      status = 0,
      message = '';

    // 验证内存限制
    if (mem === '') {
      status = 2;
      message = t('数值不能为空');
    } else if (!reg.test(mem)) {
      status = 2;
      message = t('只能输入正整数');
    } else if (+mem < 1) {
      status = 2;
      message = t('数值限制最小为1');
    } else if (max && +mem > max) {
      status = 2;
      message = t('数值限制不能大于上级业务的数值限制');
    } else {
      status = 1;
      message = '';
    }
    return { status, message };
  }
  _handleSubmit() {
    let { resourceLimits, parentResourceMaxLimit } = this.state;

    let newResourceLimits = deepClone(resourceLimits);
    newResourceLimits.forEach(item => {
      item.v_value = this._validateMemLimit(item.value, +parentResourceMaxLimit[item.type]);
      item.v_type = this._validateProjectResourceLimitType(item.type, newResourceLimits);
    });
    this.setState({ resourceLimits: newResourceLimits });

    let ok = true;
    newResourceLimits.forEach(item => {
      ok = ok && item.v_type.status === 1 && item.v_value.status === 1;
    });
    if (ok) {
      this.props.onSubmit && this.props.onSubmit(resourceLimits);
      // this.props.onCancel && this.props.onCancel();
    }
  }
  _renderResourceLimitList() {
    let { resourceLimits, parentResourceMaxLimit } = this.state;
    let content = resourceLimits.map((item, index) => {
      let maxLimit = parentResourceMaxLimit[item.type];
      return (
        <Row key={index}>
          <Col span={10} className={item.v_type.status === 2 && 'is-error'}>
            <Bubble placement="top" content={item.v_type.status === 2 ? <p>{item.v_type.message}</p> : null}>
              <div>
                <Select
                  options={resourceLimitTypeList}
                  value={item.type}
                  onChange={value => {
                    this.inputLimitType(item.id + '', value);
                  }}
                />
              </div>
            </Bubble>
          </Col>
          <Col span={8}>
            <Bubble placement="top" content={item.v_value.status === 2 ? <p>{item.v_value.message}</p> : null}>
              <div>
                <InputAdorment
                  after={resourceTypeToUnit[item.type]}
                  className={item.v_value.status === 2 && 'is-error'}
                >
                  <Input
                    placeholder={
                      maxLimit
                        ? `1-${maxLimit}`
                        : ''
                    }
                    maxLength={10}
                    type="text"
                    size="s"
                    value={item.value}
                    onChange={value => this.inputLimitValue(item.id + '', value)}
                    onBlur={e => {
                      this.validateLimitValue(item.id + '', e.target.value, item.type);
                    }}
                  />
                </InputAdorment>
              </div>
            </Bubble>
          </Col>
          <Col span={2}>
            <Button icon="close" disabled={maxLimit !== undefined} onClick={() => this.deleteLimit(item.id + '')} />
          </Col>
        </Row>
      );
    });
    content.push(
      <Row key={uuid()} style={{ width: 500 }}>
        <Col span={8}>
          <LinkButton
            style={{ marginBottom: 5 }}
            disabled={resourceLimits.length === resourceLimitTypeList.length}
            tipDirection="top"
            errorTip={'无更多限制可添加'}
            onClick={() => this.addLimit()}
          >
            新增限制
          </LinkButton>
        </Col>
      </Row>
    );
    return content;
  }
  render() {
    let { failMessage } = this.props;
    return (
      <div>
        {this._renderResourceLimitList()}
        <React.Fragment>
          <Button type="primary" style={{ margin: '0px 5px 0px 40px' }} onClick={this._handleSubmit.bind(this)}>
            {failMessage ? t('重试') : t('完成')}
          </Button>
          <Button
            type="weak"
            onClick={() => {
              this.props.onCancel();
            }}
          >
            {t('取消')}
          </Button>
          {failMessage ? (
            <Alert
              type="error"
              style={{ display: 'inline-block', marginLeft: '20px', marginBottom: '0px', maxWidth: '750px' }}
            >
              {failMessage}
            </Alert>
          ) : (
            <noscript />
          )}
        </React.Fragment>
      </div>
    );
  }
}
