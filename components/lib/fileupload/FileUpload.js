import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '../button/Button';
import { Messages } from '../messages/Messages';
import { ProgressBar } from '../progressbar/ProgressBar';
import { DomHandler, ObjectUtils, IconUtils, classNames } from '../utils/Utils';
import { Ripple } from '../ripple/Ripple';
import { localeOption } from '../api/Api';

export const FileUpload = (props) => {
    const [files, setFiles] = useState([]);
    const [msgs, setMsgs] = useState([]);
    const [progress, setProgress] = useState(0);
    const [focused, setFocused] = useState(false);
    const fileInputRef = useRef(null);
    const messagesRef = useRef(null);
    const contentRef = useRef(null);
    const duplicateIEEvent = useRef(false);
    const uploadedFileCount = useRef(0);

    const hasFiles = () => {
        return ObjectUtils.isNotEmpty(files);
    }

    const isImage = (file) => {
        return /^image\//.test(file.type);
    }

    const chooseDisabled = () => {
        return props.disabled || (props.fileLimit && props.fileLimit <= files.length + uploadedFileCount);
    }

    const uploadDisabled = () => {
        return props.disabled || !hasFiles();
    }

    const cancelDisabled = () => {
        return props.disabled || !hasFiles();
    }

    const chooseButtonLabel = () => {
        return props.chooseLabel || props.chooseOptions.label || localeOption('choose');
    }

    const uploadButtonLabel = () => {
        return props.uploadLabel || props.uploadOptions.label || localeOption('upload');
    }

    const cancelButtonLabel = () => {
        return props.cancelLabel || props.cancelOptions.label || localeOption('cancel');
    }

    const remove = (event, index) => {
        clearInput();
        let currentFiles = [...files];
        let removedFile = files[index];

        currentFiles.splice(index, 1);
        setFiles(currentFiles);

        if (props.onRemove) {
            props.onRemove({
                originalEvent: event,
                file: removedFile
            })
        }
    }

    const clearInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const clearIEInput = () => {
        if (fileInputRef.current) {
            duplicateIEEvent.current = true; //IE11 fix to prevent onFileChange trigger again
            fileInputRef.current.value = '';
        }
    }

    const formatSize = (bytes) => {
        if (bytes === 0) {
            return '0 B';
        }
        let k = 1000,
            dm = 3,
            sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    const onFileSelect = (event) => {
        if (event.type !== 'drop' && isIE11() && duplicateIEEvent.current) {
            duplicateIEEvent.current = false;
            return;
        }

        setMsgs([]);
        let currentFiles = files ? [...files] : [];
        let selectedFiles = event.dataTransfer ? event.dataTransfer.files : event.target.files;
        for (let i = 0; i < selectedFiles.length; i++) {
            let file = selectedFiles[i];

            if (!isFileSelected(file) && validate(file)) {
                if (isImage(file)) {
                    file.objectURL = window.URL.createObjectURL(file);
                }
                currentFiles.push(file);
            }
        }

        setFiles(currentFiles);

        if (hasFiles() && props.auto) {
            upload();
        }

        if (props.onSelect) {
            props.onSelect({ originalEvent: event, files: selectedFiles });
        }

        if (event.type !== 'drop' && isIE11()) {
            clearIEInput();
        }
        else {
            clearInput();
        }

        if (props.mode === 'basic' && currentFiles.length > 0) {
            fileInputRef.current.style.display = 'none';
        }
    }

    const isFileSelected = (_file) => {
        for (let sFile of files) {
            if ((sFile.name + sFile.type + sFile.size) === (_file.name + _file.type + _file.size))
                return true;
        }
        return false;
    }

    const isIE11 = () => {
        return !!window['MSInputMethodContext'] && !!document['documentMode'];
    }

    const validate = (file) => {
        if (props.maxFileSize && file.size > props.maxFileSize) {
            const message = {
                severity: 'error',
                summary: props.invalidFileSizeMessageSummary.replace('{0}', file.name),
                detail: props.invalidFileSizeMessageDetail.replace('{0}', formatSize(props.maxFileSize))
            };

            if (props.mode === 'advanced') {
                messagesRef.current.show(message);
            }

            if (props.onValidationFail) {
                props.onValidationFail(file);
            }

            return false;
        }

        return true;
    }

    const upload = () => {
        if (props.customUpload) {
            if (props.fileLimit) {
                uploadedFileCount += files.length;
            }

            if (props.uploadHandler) {
                props.uploadHandler({
                    files,
                    options: {
                        clear,
                        props
                    }
                })
            }
        }
        else {
            setMsgs([]);
            let xhr = new XMLHttpRequest();
            let formData = new FormData();

            if (props.onBeforeUpload) {
                props.onBeforeUpload({
                    'xhr': xhr,
                    'formData': formData
                });
            }

            for (let file of files) {
                formData.append(props.name, file, file.name);
            }

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    setProgress(Math.round((event.loaded * 100) / event.total));
                    if (props.onProgress) {
                        props.onProgress({
                            originalEvent: event,
                            progress
                        });
                    };
                }
            });

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    setProgress(0);

                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (props.fileLimit) {
                            uploadedFileCount += files.length;
                        }

                        if (props.onUpload) {
                            props.onUpload({ xhr, files });
                        }
                    }
                    else {
                        if (props.onError) {
                            props.onError({ xhr, files });
                        }
                    }

                    clear();
                }
            };

            xhr.open('POST', props.url, true);

            if (props.onBeforeSend) {
                props.onBeforeSend({
                    'xhr': xhr,
                    'formData': formData
                });
            }

            xhr.withCredentials = props.withCredentials;

            xhr.send(formData);
        }
    }

    const clear = () => {
        setFiles([]);
        if (props.onClear) {
            props.onClear();
        }
        clearInput();
    }

    const choose = () => {
        fileInputRef.current.click();
    }

    const onFocus = () => {
        setFocused(true);
    }

    const onBlur = () => {
        setFocused(false);
    }

    const onKeyDown = (event) => {
        if (event.which === 13) { // enter
            choose();
        }
    }

    const onDragEnter = (event) => {
        if (!props.disabled) {
            event.dataTransfer.dropEffect = "copy";
            event.stopPropagation();
            event.preventDefault();
        }
    }

    const onDragOver = (event) => {
        if (!props.disabled) {
            event.dataTransfer.dropEffect = "copy";
            DomHandler.addClass(contentRef.current, 'p-fileupload-highlight');
            event.stopPropagation();
            event.preventDefault();
        }
    }

    const onDragLeave = (event) => {
        if (!props.disabled) {
            event.dataTransfer.dropEffect = "copy";
            DomHandler.removeClass(contentRef.current, 'p-fileupload-highlight');
        }
    }

    const onDrop = (event) => {
        if (!props.disabled) {
            DomHandler.removeClass(contentRef.current, 'p-fileupload-highlight');
            event.stopPropagation();
            event.preventDefault();

            let files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
            let allowDrop = props.multiple || (files && files.length === 0);

            if (allowDrop) {
                onFileSelect(event);
            }
        }
    }

    const onSimpleUploaderClick = () => {
        if (hasFiles()) {
            upload();
        }
        else {
            fileInputRef.current.click();
        }
    }

    const useChooseButton = () => {
        const { className, style, icon, iconOnly } = props.chooseOptions;
        const chooseClassName = classNames('p-button p-fileupload-choose p-component', {
            'p-disabled': props.disabled,
            'p-focus': focused,
            'p-button-icon-only': iconOnly
        }, className);
        const labelClassName = 'p-button-label p-clickable';
        const label = iconOnly ? <span className={labelClassName} dangerouslySetInnerHTML={{ __html: "&nbsp;" }} /> : <span className={labelClassName}>{chooseButtonLabel()}</span>;

        return (
            <span className={chooseClassName} style={style} onClick={choose} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} tabIndex={0}>
                <input ref={fileInputRef} type="file" onChange={onFileSelect}
                    multiple={props.multiple} accept={props.accept} disabled={chooseDisabled()} />
                {IconUtils.getJSXIcon(icon || 'pi pi-fw pi-plus', { className: 'p-button-icon p-button-icon-left p-clickable' }, { props })}
                {label}
                <Ripple />
            </span>
        );
    }

    const useFile = (file, index) => {
        let preview = isImage(file) ? <div><img alt={file.name} role="presentation" src={file.objectURL} width={props.previewWidth} /></div> : null;
        let fileName = <div className="p-fileupload-filename">{file.name}</div>;
        let size = <div>{formatSize(file.size)}</div>;
        let removeButton = <div><Button type="button" icon="pi pi-times" onClick={(e) => remove(e, index)} /></div>
        let content = (
            <>
                {preview}
                {fileName}
                {size}
                {removeButton}
            </>
        );

        if (props.itemTemplate) {
            const defaultContentOptions = {
                onRemove: (event) => remove(event, index),
                previewElement: preview,
                fileNameElement: fileName,
                sizeElement: size,
                removeElement: removeButton,
                formatSize: formatSize(file.size),
                element: content,
                props
            };

            content = ObjectUtils.getJSXElement(props.itemTemplate, file, defaultContentOptions);
        }

        return (
            <div className="p-fileupload-row" key={file.name + file.type + file.size}>
                {content}
            </div>
        )
    }

    const useFiles = () => {
        return (
            <div className="p-fileupload-files">
                {files.map((file, index) => useFile(file, index))}
            </div>
        );
    }

    const useEmptyContent = () => {
        if (props.emptyTemplate && !hasFiles()) {
            return ObjectUtils.getJSXElement(props.emptyTemplate, props);
        }

        return null;
    }

    const useProgressBarContent = () => {
        if (props.progressBarTemplate) {
            return ObjectUtils.getJSXElement(props.progressBarTemplate, props);
        }

        return <ProgressBar value={progress} showValue={false} />;
    }

    const useAdvanced = () => {
        const className = classNames('p-fileupload p-fileupload-advanced p-component', props.className);
        const headerClassName = classNames('p-fileupload-buttonbar', props.headerClassName);
        const contentClassName = classNames('p-fileupload-content', props.contentClassName);
        let uploadButton, cancelButton, filesList, progressBar;
        const chooseButton = useChooseButton();
        const emptyContent = useEmptyContent();

        if (!props.auto) {
            const uploadOptions = props.uploadOptions;
            const cancelOptions = props.cancelOptions;
            const uploadLabel = !uploadOptions.iconOnly ? uploadButtonLabel() : '';
            const cancelLabel = !cancelOptions.iconOnly ? cancelButtonLabel() : '';

            uploadButton = <Button type="button" label={uploadLabel} icon={uploadOptions.icon || 'pi pi-upload'} onClick={upload} disabled={uploadDisabled()} style={uploadOptions.style} className={uploadOptions.className} />;
            cancelButton = <Button type="button" label={cancelLabel} icon={cancelOptions.icon || 'pi pi-times'} onClick={clear} disabled={cancelDisabled()} style={cancelOptions.style} className={cancelOptions.className} />;
        }

        if (hasFiles()) {
            filesList = useFiles();
            progressBar = useProgressBarContent();
        }

        let header = (
            <div className={headerClassName} style={props.headerStyle}>
                {chooseButton}
                {uploadButton}
                {cancelButton}
            </div>
        );

        if (props.headerTemplate) {
            const defaultContentOptions = {
                className: headerClassName,
                chooseButton,
                uploadButton,
                cancelButton,
                element: header,
                props
            };

            header = ObjectUtils.getJSXElement(props.headerTemplate, defaultContentOptions);
        }

        return (
            <div id={props.id} className={className} style={props.style}>
                {header}
                <div ref={contentRef} className={contentClassName} style={props.contentStyle}
                    onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                    {progressBar}
                    <Messages ref={messagesRef} />
                    {filesList}
                    {emptyContent}
                </div>
            </div>
        );
    }

    const useBasic = () => {
        const hasFiles = hasFiles();
        const chooseOptions = props.chooseOptions;
        const className = classNames('p-fileupload p-fileupload-basic p-component', props.className);
        const buttonClassName = classNames('p-button p-component p-fileupload-choose', { 'p-fileupload-choose-selected': hasFiles, 'p-disabled': props.disabled, 'p-focus': focused }, chooseOptions.className);
        const chooseIcon = chooseOptions.icon || classNames({ 'pi pi-plus': !chooseOptions.icon && (!hasFiles || props.auto), 'pi pi-upload': !chooseOptions.icon && hasFiles && !props.auto });
        const labelClassName = 'p-button-label p-clickable';
        const chooseLabel = chooseOptions.iconOnly ? <span className={labelClassName} dangerouslySetInnerHTML={{ __html: "&nbsp;" }} /> : <span className={labelClassName}>{chooseButtonLabel()}</span>;
        const label = props.auto ? chooseLabel : (
            <span className={labelClassName}>
                {hasFiles ? files[0].name : chooseLabel}
            </span>
        );
        const icon = IconUtils.getJSXIcon(chooseIcon, { className: 'p-button-icon p-button-icon-left' }, { props, hasFiles });

        return (
            <div className={className} style={props.style}>
                <Messages ref={messagesRef} />
                <span className={buttonClassName} style={chooseOptions.style} onMouseUp={onSimpleUploaderClick} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} tabIndex={0}>
                    {icon}
                    {label}
                    {!hasFiles && <input ref={fileInputRef} type="file" accept={props.accept} multiple={props.multiple} disabled={props.disabled} onChange={onFileSelect} />}
                    <Ripple />
                </span>
            </div>
        );
    }

    if (props.mode === 'advanced')
        return useAdvanced();
    else if (props.mode === 'basic')
        return useBasic();
}

FileUpload.defaultProps = {
    id: null,
    name: null,
    url: null,
    mode: 'advanced',
    multiple: false,
    accept: null,
    disabled: false,
    auto: false,
    maxFileSize: null,
    invalidFileSizeMessageSummary: '{0}: Invalid file size, ',
    invalidFileSizeMessageDetail: 'maximum upload size is {0}.',
    style: null,
    className: null,
    widthCredentials: false,
    previewWidth: 50,
    chooseLabel: null,
    uploadLabel: null,
    cancelLabel: null,
    chooseOptions: {
        label: null,
        icon: null,
        iconOnly: false,
        className: null,
        style: null
    },
    uploadOptions: {
        label: null,
        icon: null,
        iconOnly: false,
        className: null,
        style: null
    },
    cancelOptions: {
        label: null,
        icon: null,
        iconOnly: false,
        className: null,
        style: null
    },
    customUpload: false,
    headerClassName: null,
    headerStyle: null,
    contentClassName: null,
    contentStyle: null,
    headerTemplate: null,
    itemTemplate: null,
    emptyTemplate: null,
    progressBarTemplate: null,
    onBeforeUpload: null,
    onBeforeSend: null,
    onUpload: null,
    onError: null,
    onClear: null,
    onSelect: null,
    onProgress: null,
    onValidationFail: null,
    uploadHandler: null,
    onRemove: null
}

FileUpload.propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    mode: PropTypes.string,
    multiple: PropTypes.bool,
    accept: PropTypes.string,
    disabled: PropTypes.bool,
    auto: PropTypes.bool,
    maxFileSize: PropTypes.number,
    invalidFileSizeMessageSummary: PropTypes.string,
    invalidFileSizeMessageDetail: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    widthCredentials: PropTypes.bool,
    previewWidth: PropTypes.number,
    chooseLabel: PropTypes.string,
    uploadLabel: PropTypes.string,
    cancelLabel: PropTypes.string,
    chooseOptions: PropTypes.object,
    uploadOptions: PropTypes.object,
    cancelOptions: PropTypes.object,
    customUpload: PropTypes.bool,
    headerClassName: PropTypes.string,
    headerStyle: PropTypes.object,
    contentClassName: PropTypes.string,
    contentStyle: PropTypes.object,
    headerTemplate: PropTypes.any,
    itemTemplate: PropTypes.any,
    emptyTemplate: PropTypes.any,
    progressBarTemplate: PropTypes.any,
    onBeforeUpload: PropTypes.func,
    onBeforeSend: PropTypes.func,
    onUpload: PropTypes.func,
    onError: PropTypes.func,
    onClear: PropTypes.func,
    onSelect: PropTypes.func,
    onProgress: PropTypes.func,
    onValidationFail: PropTypes.func,
    uploadHandler: PropTypes.func,
    onRemove: PropTypes.func
}
