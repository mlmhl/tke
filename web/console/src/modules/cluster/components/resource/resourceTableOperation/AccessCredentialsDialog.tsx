import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Modal,
  Button,
  ExternalLink
} from '@tencent/tea-component';
import { FormPanel } from '@/lib/ff-component';
import { Clip } from '@src/modules/common';
import { downloadKubeconfig } from '@helper/downloadText';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { bindActionCreators } from '@/lib/ff-redux';
import { allActions } from '@src/modules/cluster/actions';
import { NamespaceCert } from '@src/modules/project/models/Namespace';
import { useCallback } from '@/node_modules/@types/react';

interface AccessCredentialsProps {
  isShowing: boolean;
  close: () => void;
  selectedResource: any;
}
const AccessCredentialsDialog = React.memo((props: AccessCredentialsProps) => {
  const state = useSelector(state => {
    const { namespaceKubectlConfig, userInfo } = state;
    return {
      namespaceKubectlConfig,
      userInfo
    };
  });
  const dispatch = useDispatch();
  const { actions } = bindActionCreators({ actions: allActions }, dispatch);
  const { namespaceKubectlConfig, userInfo } = state;
  const { isShowing, close, selectedResource } = props;

  // const getKubectlConfig = useCallback((certInfo: NamespaceCert, clusterId: string, np: string, userName: string) => {
  //   let config = `apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: ${certInfo.caCertPem}\n    server: ${certInfo.apiServer}\n  name: ${clusterId}\ncontexts:\n- context:\n    cluster: ${clusterId}\n    user: ${userName}\n  name: ${clusterId}-${np}\ncurrent-context: ${clusterId}-${np}\nkind: Config\npreferences: {}\nusers:\n- name: ${userName}\n  user:\n    client-certificate-data: ${certInfo.certPem}\n    client-key-data: ${certInfo.keyPem}\n`;
  //   return config;
  // }, []);

  const certInfo = namespaceKubectlConfig ? namespaceKubectlConfig.object && namespaceKubectlConfig.object.data : {};
  const { apiServer = '-', apiServerIP = '-' } = certInfo || {};
  const { spec = {}} = (selectedResource && selectedResource.originalDataBak) || {};
  const { clusterName: clusterId = '', namespace: np } = spec;
  const userName = userInfo && userInfo.object.data ? userInfo.object.data.name : '';
  // const kubectlConfig = certInfo ? getKubectlConfig(certInfo, clusterId, np, userName) : '';
  // const kubectlConfig = certInfo ? actions.projectNamespace.getKubectlConfig(certInfo, clusterId, np, userName) : '';
  // const kubectlConfig = 'fsdfaaa';

  /** 处理展示数据kubectlConfig*/
  const [kubectlConfig, setKubectlConfig] = useState('加载中...');
  useEffect(() => {
    const getKubectlConfig = (certInfo: NamespaceCert, clusterId: string, np: string, userName: string) => {
      let config = `apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: ${certInfo.caCertPem}\n    server: ${certInfo.apiServer}\n  name: ${clusterId}\ncontexts:\n- context:\n    cluster: ${clusterId}\n    user: ${userName}\n  name: ${clusterId}-${np}\ncurrent-context: ${clusterId}-${np}\nkind: Config\npreferences: {}\nusers:\n- name: ${userName}\n  user:\n    client-certificate-data: ${certInfo.certPem}\n    client-key-data: ${certInfo.keyPem}\n`;
      return config;
    };

    setKubectlConfig('加载中...');
    if (certInfo) {
      const result = getKubectlConfig(certInfo, clusterId, np, userName);
      setKubectlConfig(result);
    }
    }, [certInfo, clusterId, np, userName]);

  return (
    <Modal visible={isShowing} caption={t('访问凭证')} onClose={close} size={700}>
      <Modal.Body>
        <FormPanel isNeedCard={false}>
          <FormPanel.Item text label={'Kubeconfig'}>
            <div className="form-unit">
              <div className="rich-textarea hide-number" style={{ width: '100%' }}>
                <Clip target={'#kubeconfig'} className="copy-btn">
                  {t('复制')}
                </Clip>
                <a
                  href="javascript:void(0)"
                  onClick={e => downloadKubeconfig(kubectlConfig, `config`)}
                  className="copy-btn"
                  style={{ right: '50px' }}
                  >
                  {t('下载')}
                </a>
                <div className="rich-content">
                  <pre
                    className="rich-text"
                    id="kubeconfig"
                    style={{
                            whiteSpace: 'pre-wrap',
                            overflow: 'auto',
                            height: '300px'
                          }}
                      >
                    {kubectlConfig}
                  </pre>
                </div>
              </div>
            </div>
          </FormPanel.Item>
        </FormPanel>
        <div
          style={{
                textAlign: 'left',
                borderTop: '1px solid #D1D2D3',
                paddingTop: '10px',
                marginTop: '10px',
                color: '#444'
              }}
          >
          <h3 style={{ marginBottom: '1em' }}>通过Kubectl连接Kubernetes集群操作说明:</h3>
          <p style={{ marginBottom: '5px' }}>
            1. 安装 Kubectl 客户端：从
            <ExternalLink href="https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG.md">
              Kubernetes 版本页面
            </ExternalLink>
            下载最新的 kubectl 客户端，并安装和设置 kubectl 客户端，具体可参考
            <ExternalLink href="https://kubernetes.io/docs/tasks/tools/install-kubectl/">
              安装和设置 kubectl
            </ExternalLink>
            。
          </p>
          <p style={{ marginBottom: '5px' }}>2. 配置 Kubeconfig：</p>
          <ul>
            <li style={{ listStyle: 'disc', marginLeft: '15px' }}>
              <p style={{ marginBottom: '5px' }}>
                若当前访问客户端尚未配置任何集群的访问凭证，即 ~/.kube/config 内容为空，可直接复制上方 kubeconfig
                访问凭证内容并粘贴入 ~/.kube/config 中。
              </p>
            </li>
          </ul>
          <p style={{ marginBottom: '5px' }}>
            3. 可执行 kubectl get pod -n {np}
            测试是否可正常访问您的命名空间下的资源。如果无法连接请查看是否已经开启公网访问或内网访问入口，并确保访问客户端在指定的网络环境内。
            如果返回 (Forbidden) 错误，请确保用户具有所在业务相应的权限。
          </p>
          {
            WEBPACK_CONFIG_SHARED_CLUSTER && (
              <p style={{ marginBottom: '5px' }}>
                4. 当 APIServer 地址为 clb 类型地址（形如 cls-xxxxxxxxxxxxx.clb.myqcloud.com）时， 您还需要在访问机上配置域名。请在访问机上执行以下命令：sudo sed -i &#39;$a {apiServerIP} {apiServer}&#39; /etc/hosts
              </p>
            )
          }
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="primary" onClick={close}>
          {t('关闭')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default AccessCredentialsDialog;
