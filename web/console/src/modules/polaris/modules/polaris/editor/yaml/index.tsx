/**
 * yaml 修改面板
 */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { t, Trans } from '@tencent/tea-app/lib/i18n';
import { isEmpty } from '@src/modules/common/utils';
import { cutNsStartClusterId } from '@helper';
import { UnControlled as CodeMirror } from 'react-codemirror2';

const YamlEditor = React.memo((props: {
  yaml: any;
  onChange: (value: string) => void;
}) => {
  const { yaml, onChange } = props;

  /*
   * 编辑器参数
   */
  const readOnly = false;
  const codeOptions = {
    lineNumbers: true,
    mode: 'text/x-yaml',
    theme: 'monokai',
    readOnly: readOnly ? true : false, // nocursor表明焦点不能展示，不会展示光标
    spellcheck: true, // 是否开启单词校验
    autocorrect: true, // 是否开启自动修正
    lineWrapping: true, // 自动换行
    styleActiveLine: true, // 当前行背景高亮
    tabSize: 2 // tab 默认是2格
  };

  return (
    <CodeMirror
      className={'codeMirrorHeight'}
      value={yaml}
      options={codeOptions}
      onChange={(editor, data, value) => {
        // 配置项当中的value 不用props.config 是因为 更新之后，yaml的光标会默认跳转到末端
        // setNewYamlData(value);
        onChange(value);
      }}
    />
  );
});
export default YamlEditor;
