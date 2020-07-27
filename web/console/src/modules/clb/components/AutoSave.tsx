import React from 'react';
import { FormSpy, FormSpyRenderProps } from 'react-final-form';
// import diff from 'object-diff';

interface AutoSaveProps extends FormSpyRenderProps {
  setFieldData?: any;
  save: any;
}

// eslint-disable-next-line react/no-unsafe
class AutoSave extends React.Component<AutoSaveProps> {
  private promise: Promise<any>;

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  constructor(props) {
    super(props);
    this.state = { values: props.values, submitting: false };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  componentWillReceiveProps(nextProps) {
    if (this.props.active && this.props.active !== nextProps.active) {
      // blur occurred
      this.save(this.props.active);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  save = async blurredField => {
    if (this.promise) {
      await this.promise;
    }
    const { values, setFieldData, save } = this.props;

    // This diff step is totally optional
    // const difference = diff(this.state.values, values);
    // if (Object.keys(difference).length) {
    // values have changed
    this.setState({ submitting: true, values });
    setFieldData(blurredField, { saving: true });
    this.promise = save(values);
    await this.promise;
    delete this.promise;
    this.setState({ submitting: false });
    setFieldData(blurredField, { saving: false });
    // }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  render() {
    // This component doesn't have to render anything, but it can render
    // submitting state.
    return null;
  }
}

// Make a HOC
// This is not the only way to accomplish auto-save, but it does let us:
// - Use built-in React lifecycle methods to listen for changes
// - Maintain state of when we are submitting
// - Render a message when submitting
// - Pass in save prop nicely
export default props => <FormSpy {...props} subscription={{ active: true, values: true, valid: true }} component={AutoSave} />;
