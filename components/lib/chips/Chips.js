import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import { classNames, ObjectUtils } from '../utils/Utils';
import { tip } from '../tooltip/Tooltip';

export class Chips extends Component {

    static defaultProps = {
        id: null,
        inputRef: null,
        name: null,
        placeholder: null,
        value: null,
        max: null,
        disabled: null,
        readOnly: false,
        removable: true,
        style: null,
        className: null,
        tooltip: null,
        tooltipOptions: null,
        ariaLabelledBy: null,
        separator: null,
        allowDuplicate: true,
        itemTemplate: null,
        onAdd: null,
        onRemove: null,
        onChange: null,
        onFocus: null,
        onBlur: null
    }

    static propTypes = {
        id: PropTypes.string,
        inputRef: PropTypes.any,
        name: PropTypes.string,
        placeholder: PropTypes.string,
        value: PropTypes.array,
        max: PropTypes.number,
        disabled: PropTypes.bool,
        readOnly: PropTypes.bool,
        removable: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        style: PropTypes.object,
        className: PropTypes.string,
        tooltip: PropTypes.string,
        tooltipOptions: PropTypes.object,
        ariaLabelledBy: PropTypes.string,
        separator: PropTypes.string,
        allowDuplicate: PropTypes.bool,
        itemTemplate: PropTypes.func,
        onAdd: PropTypes.func,
        onRemove: PropTypes.func,
        onChange: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func
    }

    constructor(props) {
        super(props);

        this.state = {
            focused: false
        };

        this.onWrapperClick = this.onWrapperClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onPaste = this.onPaste.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);

        this.inputRef = createRef(this.props.inputRef);
    }

    removeItem(event, index) {
        if (this.props.disabled && this.props.readOnly) {
            return;
        }

        let values = [...this.props.value];
        const removedItem = values.splice(index, 1);

        if (!this.isRemovable(removedItem, index)) {
            return;
        }

        if (this.props.onRemove) {
            this.props.onRemove({
                originalEvent: event,
                value: removedItem
            });
        }

        if (this.props.onChange) {
            this.props.onChange({
                originalEvent: event,
                value: values,
                stopPropagation : () =>{},
                preventDefault : () =>{},
                target: {
                    name: this.props.name,
                    id: this.props.id,
                    value : values
                }
            });
        }
    }

    addItem(event, item, preventDefault) {
        if (item && item.trim().length) {
            let values = this.props.value ? [...this.props.value] : [];

            if (this.props.allowDuplicate || values.indexOf(item) === -1) {
                values.push(item);

                if (this.props.onAdd) {
                    this.props.onAdd({
                        originalEvent: event,
                        value: item
                    });
                }
            }
            this.updateInput(event, values, preventDefault)
        }

    }

    onWrapperClick() {
        this.inputRef.current.focus();
    }

    onKeyDown(event) {
        const inputValue = event.target.value;
        const values = this.props.value || [];

        switch(event.which) {
            //backspace
            case 8:
                if (this.inputRef.current.value.length === 0 && values.length > 0) {
                    this.removeItem(event, values.length - 1);
                }
            break;

            //enter
            case 13:
                if (inputValue && inputValue.trim().length && (!this.props.max || this.props.max > values.length)) {
                    this.addItem(event, inputValue, true);
                }
            break;

            default:
                if (this.isMaxedOut()) {
                    event.preventDefault();
                }
                else if (this.props.separator) {
                    if (this.props.separator === ',' && event.which === 188) {
                        this.addItem(event, inputValue, true);
                    }
                }
            break;
        }
    }

    updateInput(event, items, preventDefault) {
        if (this.props.onChange) {
            this.props.onChange({
                originalEvent: event,
                value: items,
                stopPropagation : () =>{},
                preventDefault : () =>{},
                target: {
                    name: this.props.name,
                    id: this.props.id,
                    value : items
                }
            });
        }

        this.inputRef.current.value = '';

        if (preventDefault) {
            event.preventDefault();
        }
    }

    onPaste(event) {
        if (this.props.separator) {
            let pastedData = (event.clipboardData || window['clipboardData']).getData('Text');

            if (pastedData) {
                let values = this.props.value || [];
                let pastedValues = pastedData.split(this.props.separator);
                pastedValues = pastedValues.filter(val => ((this.props.allowDuplicate || values.indexOf(val) === -1) && val.trim().length));
                values = [...values, ...pastedValues];

                this.updateInput(event, values, true)
            }

        }
    }

    onFocus(event) {
        event.persist();
        this.setState({ focused: true }, () => {
            if (this.props.onFocus) {
                this.props.onFocus(event);
            }
        });
    }

    onBlur(event) {
        event.persist();
        this.setState({ focused: false }, () => {
            if (this.props.onBlur) {
                this.props.onBlur(event);
            }
        });
    }

    isMaxedOut() {
        return this.props.max && this.props.value && this.props.max === this.props.value.length;
    }

    isFilled() {
        return (this.props.value && this.props.value.length) || (this.inputRef && this.inputRef.current && this.inputRef.current.value && this.inputRef.current.value.length);
    }

    isRemovable(value, index) {
        return ObjectUtils.getPropValue(this.props.removable, { value, index, props: this.props })
    }

    updateInputRef() {
        let ref = this.props.inputRef;

        if (ref) {
            if (typeof ref === 'function') {
                ref(this.inputRef.current);
            }
            else {
                ref.current = this.inputRef.current;
            }
        }
    }

    componentDidMount() {
        this.updateInputRef();

        if (this.props.tooltip) {
            this.renderTooltip();
        }
    }

    componentDidUpdate(prevProps) {
        let isValueSame = this.props.value && prevProps.value && prevProps.value.length === this.props.value.length;
        if (this.props.tooltip) {
            if (prevProps.tooltip !== this.props.tooltip || prevProps.tooltipOptions !== this.props.tooltipOptions) {
                if (this.tooltip)
                    this.tooltip.update({ content: this.props.tooltip, ...(this.props.tooltipOptions || {}) });
                else
                    this.renderTooltip();
            }
            else if (!isValueSame && this.tooltip) {
                this.tooltip.deactivate();
                this.tooltip.activate();
            }
        }
    }

    componentWillUnmount() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }

    renderTooltip() {
        this.tooltip = tip({
            target: this.inputRef.current,
            targetContainer: this.listElement,
            content: this.props.tooltip,
            options: this.props.tooltipOptions
        });
    }

    renderRemoveIcon(value, index) {
        if (!this.props.disabled && !this.props.readOnly && this.isRemovable(value, index)) {
            return (
                <span className="p-chips-token-icon pi pi-times-circle" onClick={(event) => this.removeItem(event, index)}></span>
            )
        }

        return null;
    }

    renderItem(value, index) {
        const content = this.props.itemTemplate ? this.props.itemTemplate(value) : value;
        const icon = this.renderRemoveIcon(value, index);

        return (
            <li key={index} className="p-chips-token p-highlight">
                <span className="p-chips-token-label">{content}</span>
                {icon}
            </li>
        );
    }

    renderInputElement() {
        return (
            <li className="p-chips-input-token">
                <input ref={this.inputRef} placeholder={this.props.placeholder} type="text" name={this.props.name} disabled={this.props.disabled||this.isMaxedOut()}
                            onKeyDown={this.onKeyDown} onPaste={this.onPaste} onFocus={this.onFocus} onBlur={this.onBlur} aria-labelledby={this.props.ariaLabelledBy}
                            readOnly={this.props.readOnly} />
            </li>
        );
    }

    renderItems() {
        if (this.props.value) {
            return this.props.value.map((value, index) => {
                return this.renderItem(value, index);
            });
        }

        return null;
    }

    renderList() {
        const className = classNames('p-inputtext p-chips-multiple-container', {
            'p-disabled': this.props.disabled,
            'p-focus': this.state.focused
        });
        const items = this.renderItems();
        const inputElement = this.renderInputElement();

        return (
            <ul ref={(el) => this.listElement = el} className={className} onClick={this.onWrapperClick}>
                {items}
                {inputElement}
            </ul>
        );
    }

    render() {
        const className = classNames('p-chips p-component p-inputwrapper', this.props.className, {
            'p-inputwrapper-filled': this.isFilled(),
            'p-inputwrapper-focus': this.state.focused
        });
        const list = this.renderList();

        return (
            <div ref={(el) => this.element = el} id={this.props.id} className={className} style={this.props.style}>
                {list}
            </div>
        );
    }
}
