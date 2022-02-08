/* eslint-disable no-unused-vars */

import Button from '@enact/sandstone/Button';
import {Dropdown} from '@enact/sandstone/Dropdown';
import {SwitchItem} from '@enact/sandstone/SwitchItem';
import Popup from '@enact/sandstone/Popup';
import LS2Request from '@enact/webos/LS2Request';
import React from 'react';

const appId = 'me.wouterdek.magic4pc';

class MainPanel extends React.Component {
	constructor(props) {
		super(props);

		this.startService = this.startService.bind(this);
		this.onButton = this.onButton.bind(this);
		this.onButtonDown = this.onButtonDown.bind(this);
		this.onButtonUp = this.onButtonUp.bind(this);
		this.stopService = this.stopService.bind(this);
		this.autostartToggle = this.autostartToggle.bind(this);
		this.queryServiceStatus = this.queryServiceStatus.bind(this);
		this.updateLog = this.updateLog.bind(this);
		this.onVisibilityChange = this.onVisibilityChange.bind(this);
		this.componentDidMount = this.componentDidMount.bind(this);
		this.componentWillUnmount = this.componentWillUnmount.bind(this);
		this.onInputSourceSelected = this.onInputSourceSelected.bind(this);
		this.handleOpenPopup = this.handleOpenPopup.bind(this);
		this.handleClosePopup = this.handleClosePopup.bind(this);
		this.onCursorVisibilityChange = this.onCursorVisibilityChange.bind(this);

		this.state = {
			label: '',
			videoSource: 'ext://hdmi:1',
			popupOpen: false,
			settingsButtonVisible: true,
			autostartEnabled: false,
		};
	}

	startService() {
		console.log('Requesting service start');
		let onSuccess = (inResponse) => {
			console.log('Service started');
			this.updateLog();
			return true;
		};
		let onFailure = (inError) => {
			console.log('Service start failure: ' + inError);
			this.setState({label: 'Service start error'});
			return;
		};
		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'start',
			onSuccess: onSuccess,
			onFailure: onFailure,
		});
	}

	onButton(keyCode, isDown) {
		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'onInput',
			parameters: {
				keyCode: keyCode,
				isDown: isDown,
			},
			onSuccess: (inResponse) => {
				return true;
			},
			onFailure: (inError) => {
				return;
			},
		});
	}

	onButtonDown(event) {
		console.log(event.keyCode + ' down');
		this.onButton(event.keyCode, true);
	}

	onButtonUp(event) {
		console.log(event.keyCode + ' up');
		this.onButton(event.keyCode, false);
	}

	stopService() {
		console.log('Requesting service stop');
		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'stop',
			onSuccess: (inResponse) => {
				console.log('Service stopped');
				this.updateLog();
				return true;
			},
			onFailure: (inError) => {
				console.log('Service stop failure: ' + inError);
				this.setState({label: 'Service stop error'});
				return;
			},
		});
	}

	queryServiceStatus(onSuccess, onError) {
		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'query',
			parameters: {},
			onSuccess: onSuccess,
			onFailure: onError,
		});
	}

	updateLog() {
		this.queryServiceStatus(
			(msg) => {
				console.log(msg);
				let label = '';
				if (msg.isConnected) {
					label =
						'Connected to ' +
						msg.unicastRInfo.address +
						':' +
						msg.unicastRInfo.port;
				} else if (msg.broadcastAdsActive) {
					label = 'Waiting for client to connect';
				} else if (!msg.serviceActive) {
					label = 'Service disabled';
				} else {
					label = 'Service error';
				}
				this.setState({label: label});
			},
			(inError) => {
				console.log('Error retrieving service state: ' + inError);
				this.setState({label: 'Error retrieving service state'});
			}
		);
	}

	onVisibilityChange() {
		if (document.hidden) {
			this.stopService();
		} else {
			this.startService();
		}
	}

	onCursorVisibilityChange(e) {
		let isVisible = e.detail.visibility;
		this.setState({settingsButtonVisible: isVisible});
	}

	onMouse(e) {
		console.log(e.type);

		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'onMouse',
			parameters: {
				type: e.type, // mousedown, mouseup
				x: e.screenX,
				y: e.screenY,
			},
		});
	}

	onWheel(e) {
		console.log('wheel', e.wheelDelta > 0 ? 'up' : 'down');

		new LS2Request().send({
			service: 'luna://me.wouterdek.magic4pc.service/',
			method: 'onWheel',
			parameters: {
				x: e.screenX,
				y: e.screenY,
				delta: e.wheelDelta,
			},
		});
	}

	componentDidMount() {
		document.addEventListener('keydown', this.onButtonDown, false);
		document.addEventListener('keyup', this.onButtonUp, false);
		document.addEventListener(
			'visibilitychange',
			this.onVisibilityChange,
			false
		);
		document.addEventListener(
			'cursorStateChange',
			this.onCursorVisibilityChange,
			false
		);
		document.addEventListener('mousedown', this.onMouse, false);
		document.addEventListener('mouseup', this.onMouse, false);
		document.addEventListener('wheel', this.onWheel, false);
		this.loadSettings();

		new LS2Request().send({
			service: 'luna://com.webos.service.eim/',
			method: 'getAllInputStatus',
			onSuccess: (resp) => {
				const autostartEnabled =
					resp.devices.map((dev) => dev.appId).indexOf(appId) !== -1;
				this.setState({
					autostartEnabled,
				});
			},
		});
	}

	autostartToggle(evt) {
		console.info('autostart toggle:', evt);
		if (evt.selected) {
			new LS2Request().send({
				service: 'luna://com.webos.service.eim/',
				method: 'addDevice',
				parameters: {
					appId,
					pigImage: '',
					mvpdIcon: '',
					showPopup: true,
					label: 'Magic4PC',
				},
				onSuccess: (resp) => {
					this.setState({autostartEnabled: evt.selected});
				},
				onFailure: (err) => {
					console.warn(err);
				},
			});
		} else {
			new LS2Request().send({
				service: 'luna://com.webos.service.eim/',
				method: 'deleteDevice',
				parameters: {
					appId,
				},
				onSuccess: (resp) => {
					this.setState({autostartEnabled: evt.selected});
				},
				onFailure: (err) => {
					console.warn(err);
				},
			});
		}
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.onButtonPress, false);
		document.removeEventListener('keyup', this.onButtonPress, false);
		document.removeEventListener(
			'visibilitychange',
			this.onVisibilityChange,
			false
		);
		document.removeEventListener(
			'cursorStateChange',
			this.onCursorVisibilityChange,
			false
		);
	}

	inputSourceLabels = [
		'HDMI 1',
		'HDMI 2',
		'HDMI 3',
		'HDMI 4',
		'Comp 1',
		'AV 1',
		'AV 2',
	];

	inputSources = [
		'ext://hdmi:1',
		'ext://hdmi:2',
		'ext://hdmi:3',
		'ext://hdmi:4',
		'ext://comp:1',
		'ext://av:1',
		'ext://av:2',
	];

	onInputSourceSelected({selected}) {
		let selectedSource = this.inputSources[selected];
		console.info('Switching sources to:', selectedSource, selected);
		this.setState(
			{
				videoSource: selectedSource,
			},
			() => {
				this.saveSettings();
			}
		);

		let vidElem = document.getElementById('vidElem');
		let vidSrcElem = document.getElementById('vidSrcElem');

		vidElem.pause();
		vidSrcElem.src = selectedSource;
		vidElem.load();
		vidElem.play();
	}

	saveSettings() {
		window.localStorage.magic4pcSettings = JSON.stringify({
			videoSource: this.state.videoSource,
		});
	}

	loadSettings() {
		let savedSettings;
		try {
			savedSettings = JSON.parse(window.localStorage.magic4pcSettings);
		} catch (err) {
			console.warn('Unable to parse:', err);
		}

		let settings = {
			videoSource: this.inputSources[0],
			...savedSettings,
		};
		console.info('Settings:', settings);

		this.onInputSourceSelected({
			selected: this.inputSources.indexOf(settings.videoSource),
		});
	}

	overlayStyle = {
		position: 'fixed',
		width: '100%',
		height: '100%',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 2,
	};

	handleOpenPopup() {
		this.setState({popupOpen: true});
		this.updateLogTask = setInterval(() => this.updateLog(), 1000);
	}

	handleClosePopup() {
		this.setState({popupOpen: false});
		clearInterval(this.updateLogTask);
	}

	render() {
		return (
			<div>
				<video id="vidElem" autoPlay>
					<source
						id="vidSrcElem"
						type="service/webos-external"
						src={this.state.videoSource}
					/>
				</video>
				<div style={this.overlayStyle}>
					{this.state.settingsButtonVisible ? (
						<Button onClick={this.handleOpenPopup} icon="gear" />
					) : null}
					<Popup open={this.state.popupOpen} onClose={this.handleClosePopup}>
						<div>
							<p id="status">{this.state.label}</p>
						</div>
						<div>
							<Dropdown
								defaultSelected={this.inputSources.indexOf(
									this.state.videoSource
								)}
								title="Input source"
								onSelect={this.onInputSourceSelected}
							>
								{this.inputSourceLabels}
							</Dropdown>
							<Button onClick={this.startService} size="small">
								Enable
							</Button>
							<Button onClick={this.stopService} size="small">
								Disable
							</Button>
							<div style={{width: '12em', display: 'inline-block'}}>
								<SwitchItem
									selected={this.state.autostartEnabled}
									onToggle={this.autostartToggle}
								>
									Autostart
								</SwitchItem>
							</div>
						</div>
					</Popup>
				</div>
			</div>
		);
	}
}

export default MainPanel;
