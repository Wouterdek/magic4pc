import Button from '@enact/sandstone/Button';
import {Dropdown, DropdownDecorator} from '@enact/sandstone/Dropdown';
import Popup from '@enact/sandstone/Popup';
import kind from '@enact/core/kind';
import {Panel, Header} from '@enact/sandstone/Panels';
import LS2Request from '@enact/webos/LS2Request';
import React from 'react'

class MainPanel extends React.Component {
	constructor(props)
	{
		super(props);

		this.startService = this.startService.bind(this);
		this.onButton = this.onButton.bind(this);
		this.onButtonDown = this.onButtonDown.bind(this);
		this.onButtonUp = this.onButtonUp.bind(this);
		this.stopService = this.stopService.bind(this);
		this.queryServiceStatus = this.queryServiceStatus.bind(this);
		this.updateLog = this.updateLog.bind(this);
		this.onVisibilityChange = this.onVisibilityChange.bind(this);
		this.componentWillMount = this.componentWillMount.bind(this);
		this.componentWillUnmount = this.componentWillUnmount.bind(this);
		this.onInputSourceSelected = this.onInputSourceSelected.bind(this);
		this.handleOpenPopup = this.handleOpenPopup.bind(this);
		this.handleClosePopup = this.handleClosePopup.bind(this);
		this.onCursorVisibilityChange = this.onCursorVisibilityChange.bind(this);

		this.state = {
			label: "",
			videoSource: "ext://hdmi:1",
			popupOpen: false,
			settingsButtonVisible: true
		};
	}

	startService()
	{
		console.log("Requesting service start");
		let onSuccess = (inResponse) => {
			console.log("Service started");
			this.updateLog();
			return true;
		};
		let onFailure = (inError) => {
			console.log("Service start failure: "+inError);
			this.setState({label: "Service start error"});
			return;
		};
		new LS2Request().send({
			service: "luna://me.wouterdek.magic4pc.service/",
			method: 'start',
			onSuccess: onSuccess,
			onFailure: onFailure
		});
	}

	onButton(keyCode, isDown)
	{
		new LS2Request().send({
			service: "luna://me.wouterdek.magic4pc.service/",
			method: 'onInput',
			parameters: {
				keyCode: keyCode,
				isDown: isDown
			},
			onSuccess: (inResponse) => {
				return true;
			},
			onFailure: (inError) => {
				return;
			}
		});
	}

	onButtonDown(event)
	{
		console.log(event.keyCode + " down");
		this.onButton(event.keyCode, true);
	}

	onButtonUp(event)
	{
		console.log(event.keyCode + " up");
		this.onButton(event.keyCode, false);
	}

	stopService()
	{
		console.log("Requesting service stop");
		new LS2Request().send({
			service: "luna://me.wouterdek.magic4pc.service/",
			method: 'stop',
			onSuccess: (inResponse) => {
				console.log("Service stopped");
				this.updateLog();
				return true;
			},
			onFailure: (inError) => {
				console.log("Service stop failure: "+inError);
				this.setState({label: "Service stop error"});
				return;
			}
		});
	}

	queryServiceStatus(onSuccess, onError)
	{
		new LS2Request().send({
			service: "luna://me.wouterdek.magic4pc.service/",
			method: 'query',
			parameters: { },
			onSuccess: onSuccess,
			onFailure: onError
		});
	}

	updateLog()
	{
		this.queryServiceStatus((msg) => {
			console.log(msg);
			let label = "";
			if(msg.isConnected)
			{
				label = "Connected to "+msg.unicastRInfo.address+":"+msg.unicastRInfo.port;
			}
			else if(msg.broadcastAdsActive)
			{
				label = "Waiting for client to connect";
			}
			else if(!msg.serviceActive)
			{
				label = "Service disabled";
			}
			else
			{
				label = "Service error";
			}
			this.setState({label: label});
		}, (inError) => {
			console.log("Error retrieving service state: "+inError);
			this.setState({label: "Error retrieving service state"});
		});
	}

	onVisibilityChange()
	{
		if (document.hidden)
		{
			this.stopService();
		}
		else
		{
			this.startService();
		}
	}

	onCursorVisibilityChange(e)
	{
		var isVisible = e.detail.visibility;
		this.setState({settingsButtonVisible: isVisible});
	}

	componentWillMount()
	{
		document.addEventListener("keydown", this.onButtonDown, false);
		document.addEventListener("keyup", this.onButtonUp, false);
		document.addEventListener('visibilitychange', this.onVisibilityChange, false);
		document.addEventListener('cursorStateChange', this.onCursorVisibilityChange, false);
	}

	componentWillUnmount()
	{
		document.removeEventListener("keydown", this.onButtonPress, false);
		document.removeEventListener("keyup", this.onButtonPress, false);
		document.removeEventListener('visibilitychange', this.onVisibilityChange, false);
		document.removeEventListener('cursorStateChange', this.onCursorVisibilityChange, false);
	}

	inputSourceLabels = [
		'HDMI 1',
		'HDMI 2',
		'HDMI 3',
		'HDMI 4',
		'Comp 1',
		'AV 1',
		'AV 2',
	]
	
	inputSources = [
		'ext://hdmi:1',
		'ext://hdmi:2',
		'ext://hdmi:3',
		'ext://hdmi:4',
		'ext://comp:1',
		'ext://av:1',
		'ext://av:2'
	]

	onInputSourceSelected({selected})
	{
		let selectedSource = this.inputSources[selected];
		
		this.setState({
			videoSource: selectedSource
		});

		let vidElem = document.getElementById("vidElem");
		let vidSrcElem = document.getElementById("vidSrcElem");

		vidElem.pause();
		vidSrcElem.src = selectedSource;
		vidElem.load();
		vidElem.play();
	}

	overlayStyle = {
		position: 'fixed',
		width: '100%',
		height: '100%',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 2
	}
	
	handleOpenPopup()
	{
		this.setState({popupOpen: true});
		this.updateLogTask = setInterval(() => this.updateLog(), 1000);
	}

	handleClosePopup()
	{
		this.setState({popupOpen: false});
		clearInterval(this.updateLogTask);
	}

	render () {
	  return(
		<div>
		  	<video id="vidElem" autoPlay>
				<source id="vidSrcElem" type="service/webos-external" src={this.state.videoSource}/>
			</video>
			<div style={this.overlayStyle}>
				{this.state.settingsButtonVisible ? <Button onClick={this.handleOpenPopup} icon="gear"/> : null}
				<Popup open={this.state.popupOpen} onClose={this.handleClosePopup}>
					<div>
						<p id="status">{this.state.label}</p>
					</div>
					<div>
						<Dropdown defaultSelected={this.inputSources.indexOf(this.state.videoSource)} title="Input source" onSelect={this.onInputSourceSelected}>{this.inputSourceLabels}</Dropdown>
						<Button onClick={this.startService}>Enable</Button>
						<Button onClick={this.stopService}>Disable</Button>
						<Button onClick={this.handleClosePopup}>Close</Button>
					</div>
				</Popup>
			</div>
		</div>
	  )
	}
}

export default MainPanel;
