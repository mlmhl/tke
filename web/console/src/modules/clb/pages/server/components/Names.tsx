/**
 * Pod名称编辑器
 */
import React from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Modal,
  // Divider,
  PopConfirm,
  Select,
  Tag,
  Tooltip,
  Text,
} from '@tencent/tea-component';

const { isEqual } = require('lodash');

interface PropTypes {
  value: any[];

  onChange: (value) => void;
}

interface StateTypes {
  data: any[];

  loading: boolean;
}

class Names extends React.Component<PropTypes, StateTypes> {
  index = 0;
  cacheOriginData = {};
  clickedCancel = false;

  state = {
    data: this.props.value,
    loading: false,
  };

  getRowByKey = (key, newData) => {
    const { data } = this.state;
    return (newData || data).filter(item => item.key === key)[0];
  };

  /**
   * 切换当前行的编辑状态
   * @param e
   * @param key
   */
  toggleEditable = (e, key) => {
    e.preventDefault();
    const { data } = this.state;
    const newData = data.map(item => ({ ...item }));
    const target = this.getRowByKey(key, newData);
    if (target) {
      // 进入编辑状态时保存原始数据
      if (!target.editable) {
        this.cacheOriginData[key] = { ...target };
      }
      target.editable = !target.editable;
      this.setState({ data: newData });
    }
  };

  /**
   * 新增一项
   */
  newItem = () => {
    const { data } = this.state;
    const newData = data.map(item => ({ ...item }));
    newData.push({
      key: `NEW_TEMP_ID_${this.index}`,
      name: '',
      editable: true,
      isNew: true,
    });
    this.index += 1;
    this.setState({ data: newData });
  };

  /**
   * 删除当前行
   * @param key
   */
  remove = key => {
    const { data } = this.state;
    const newData = data.filter(item => item.key !== key);
    this.setState({ data: newData });
    const { onChange } = this.props;
    if (onChange) {
      onChange(newData);
    }
  };

  /**
   * 处理回车操作，保存当前行
   * @param e
   * @param key
   */
  handleKeyPress = (e, key) => {
    if (e.key === 'Enter') {
      this.saveRow(e, key);
    }
  };

  handleFieldChange = (value, fieldName, key) => {
    const { data } = this.state;
    const newData = data.map(item => ({ ...item }));
    const target = this.getRowByKey(key, newData);
    if (target) {
      target[fieldName] = value;
      this.setState({ data: newData });
    }
  };

  /**
   * 保存当前行
   * @param e
   * @param key
   */
  saveRow = (e, key) => {
    e.persist();
    this.setState({
      loading: true,
    });
    setTimeout(() => {
      if (this.clickedCancel) {
        this.clickedCancel = false;
        return;
      }
      const target = this.getRowByKey(key, null) || {};
      const isInvalid = target => {
        const { name } = target;
        // 首先检查 key 值是否重复
        if (this.state.data.some(item => item.name === name && item.key !== target.key)) {
          return true;
        }
        return !name;
      };
      if (isInvalid(target)) {
        Modal.alert({ message: '请填写完整信息且不能重复。' });
        e.target.focus();
        this.setState({
          loading: false,
        });
        return;
      }
      delete target.isNew;
      this.toggleEditable(e, key);
      const { data } = this.state;
      const { onChange } = this.props;
      if (onChange) {
        onChange(data);
      }
      this.setState({
        loading: false,
      });
    }, 300);
  };

  /**
   * 取消编辑
   * @param e
   * @param key
   */
  cancel = (e, key) => {
    this.clickedCancel = true;
    e.preventDefault();
    const { data } = this.state;
    const newData = data.map(item => ({ ...item }));
    const target = this.getRowByKey(key, newData);
    if (this.cacheOriginData[key]) {
      Object.assign(target, this.cacheOriginData[key]);
      delete this.cacheOriginData[key];
    }
    target.editable = false;
    this.setState({ data: newData });
    this.clickedCancel = false;
  };

  getColumns = () => {
    const renderNameField = record => {
      let text = record.name;
      if (record.editable) {
        return (
          <Input
            value={text}
            onChange={value => this.handleFieldChange(value, 'name', record.key)}
            onKeyPress={e => this.handleKeyPress(e, record.key)}
          />
        );
      }
      return text;
    };

    const renderActions = record => {
      const { loading } = this.state;
      if (!!record.editable && loading) {
        return null;
      }
      if (record.editable) {
        if (record.isNew) {
          return (
            <span>
              <a onClick={e => this.saveRow(e, record.key)}>添加</a>
              {/*<Divider type="vertical" />*/}
              {/*<Popconfirm title="是否要删除此行？" onConfirm={() => this.remove(record.key)}>*/}
              {/*  <a>删除</a>*/}
              {/*</Popconfirm>*/}
              <Text> | </Text>
              <a onClick={e => this.remove(record.key)}>删除</a>
            </span>
          );
        }
        return (
          <span>
            <a onClick={e => this.saveRow(e, record.key)}>保存</a>
            {/*<Divider type="vertical" />*/}
            <Text> | </Text>
            <a onClick={e => this.cancel(e, record.key)}>取消</a>
          </span>
        );
      }
      return (
        <span>
          <a onClick={e => this.toggleEditable(e, record.key)}>编辑</a>
          {/*<Divider type="vertical" />*/}
          <Text> | </Text>
          {/*<Popconfirm title="是否要删除此行？" onConfirm={() => this.remove(record.key)}>*/}
          {/*  <a>删除</a>*/}
          {/*</Popconfirm>*/}
          <a onClick={e => this.remove(record.key)}>删除</a>
        </span>
      );
    };
    const columns = [
      {
        key: 'name',
        header: '名称',
        render: renderNameField,
      },
      {
        key: 'action',
        header: '操作',
        render: renderActions,
      },
    ];
    return columns;
  };

  render = () => {
    const { loading, data } = this.state;

    return (
      <Card bordered>
        <Card.Body>
          <Table columns={this.getColumns()} records={data} />
          <Button
            style={{ width: '100%', marginTop: 16, marginBottom: 8 }}
            type="weak"
            htmlType="button"
            onClick={this.newItem}
          >
            新增一项
          </Button>
        </Card.Body>
      </Card>
    );
  };
}

export { Names };
