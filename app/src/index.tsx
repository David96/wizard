import React, {FormEvent} from 'react';
import { createRoot } from 'react-dom/client';
import {username, roomname, Message, MessageType, Card, AnnounceUI, HandUI, TableUI,
  UserListUI, MessageListUI, ScoreBoardUI, JoinUI, ChooseTrumpUI} from './UIElements'
import './index.css';

export let websocket : WebSocket;

interface Player {
  name : string;
  active : boolean;
  announcement : number;
  score : number;
  tricks : number;
  turn : boolean;
}

interface GameState {
  table : Card[];
  hand : Card[];
  round : number;
  trump : Card;
  announcing : boolean;
  choosing_trump : string;
  game_over : boolean;
  winners : string[];
}

interface GameScreenProps {
  game_state : GameState;
  players : Player[];
  messages : Message[];
  waiting_for : string[];
  creator : boolean;
}

class GameScreen extends React.Component<GameScreenProps> {
  kick(players : string[]) {
    players.forEach((p) => {
      websocket.send(JSON.stringify({action: 'kick', user: p}));
    });
  }
  render() {
    document.title = "Wizard";
    let curPlayer = this.props.players.find((p) => p.turn)
    let myTurn = (!this.props.game_state.choosing_trump && curPlayer && curPlayer.name === username)
              || this.props.game_state.choosing_trump === username;
    if (myTurn) {
        document.title = "Wizard - It's your turn!";
    }
    return [
        <div className='main'>
          {this.props.waiting_for && this.props.waiting_for.length > 0 &&
              <div className='waiting'>
                <p id='waiting-list'>{this.props.waiting_for}</p>
              {this.props.creator &&
                  <button className="center" id="kick"
                  onClick={() => this.kick(this.props.waiting_for)}>Kick em</button>}
              </div>
          }
          {this.props.game_state.announcing && myTurn && <AnnounceUI />}
          {this.props.game_state.choosing_trump === username && <ChooseTrumpUI />}
          <TableUI trump={this.props.game_state.trump} cards={this.props.game_state.table} />
          <HandUI cards={this.props.game_state.hand} />
        </div>,
        <div className='controls right'>
          <UserListUI round={this.props.game_state.round} players={this.props.players} />
          <MessageListUI messages={this.props.messages} />
        </div>,
    ];
  }
}

interface WaitingRoomScreenProps {
  game_over : boolean;
  players : Player[];
  winners : String[];
  creator : boolean;
  room_id? : string;
}
class WaitingRoomScreen extends React.Component<WaitingRoomScreenProps> {
  onClick(event : FormEvent) {
    event.preventDefault();
    websocket.send(JSON.stringify({action: 'start_game'}));
  }

  render() {
    let winners = "";
    if (this.props.game_over) {
      let winner_list = this.props.winners;
      winners = winner_list.join(", ");
      if (winner_list.length > 1) {
        winners = winners + " win the game!";
      } else {
        winners = winners + " wins the game!";
      }
    }
    return (
      <div className='pyro-container'>
        <h2>Your room id: {this.props.room_id}</h2>
        <div id="gameover" className={this.props.game_over ? "pyro" : undefined}>
          <div className="before"></div>
          <div className="after"></div>
          <h1 className="winner">{winners}</h1>
          { this.props.players &&
              <ScoreBoardUI players={this.props.players} /> }
          { this.props.creator &&
              <button  className="center" id="start_game"
                  onClick={this.onClick.bind(this)}>(Re)start game</button> }
        </div>
      </div>
    );
  }
}

enum GameStates {
  NONE = 0,
  JOINED = 1,
  RUNNING = 2,
  GAME_OVER = 3,
}
interface GameUIState{
  name : string;
  creator : boolean;
  running : boolean;
  players? : Player[];
  state : GameStates;
  game_state? : GameState;
  waiting_for : string[];
  messages : Message[];
  room_id?: string;
  ready : boolean;
}
class Game extends React.Component<{}, GameUIState> {

  constructor(props : {}) {
    super(props);

    this.state = {
      name: '',
      creator: false,
      running: false,
      players: undefined,
      state: GameStates.NONE,
      game_state: undefined,
      waiting_for: [],
      messages: [],
      ready : false,
      room_id : undefined
    };

    this.connect();
  }

  connect() {
    const ws = new WebSocket('ws://127.0.0.1:6791');
    websocket = ws;
    ws.onopen = this.onOpen.bind(this);
    ws.onmessage = this.onMessage.bind(this);

    ws.onerror = (e) => {
      console.log("Websocket error: " + e);
      ws.close();
    }

    ws.onclose = (ev: CloseEvent) => {
      console.log("Websocket closed: " + ev.reason);
      console.log("Reconnecting…");
      // Give the server a chance to come back up before retrying
      window.setTimeout(() => this.connect(), 2000);
    };
  }

  onOpen() {
    this.setState({ready: true});
    // After a reconnect, join the room again so the server sends us the
    // current game state (the initial join is handled by the JoinUI)
    if (username && roomname) {
      websocket.send(JSON.stringify({action: 'join', name: username, room: roomname}));
    }
  }

  render() {
    if (!this.state.ready) return;

    switch (this.state.state) {
      case GameStates.NONE:
        return (
          <JoinUI />
        );
      case GameStates.JOINED:
        return (
          <WaitingRoomScreen
            players={this.state.players ?? []}
            winners={this.state.game_state?.winners ?? []}
            creator={this.state.creator}
            room_id={this.state.room_id}
            game_over={false} />
        );
      case GameStates.RUNNING:
        if (!this.state.players || !this.state.game_state) {
          return <div />;
        }
        return (
          <GameScreen
            players={this.state.players}
            messages={this.state.messages}
            game_state={this.state.game_state}
            waiting_for={this.state.waiting_for}
            creator={this.state.creator} />
        );
      case GameStates.GAME_OVER:
        return (
          <WaitingRoomScreen
            players={this.state.players ?? []}
            winners={this.state.game_state?.winners ?? []}
            creator={this.state.creator}
            room_id={this.state.room_id}
            game_over={true} />
        );
      default:
        return <div>Unsorpported state</div>;
    }
  }

  onMessage(event : MessageEvent) {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'joined':
        this.setState({
          messages: this.state.messages.concat([{msg_type: MessageType.MESSAGE,
                                                msg: 'You joined the game!'}]),
          state: GameStates.JOINED,
          room_id: data.room_id
        });
        break;
      case 'state':
        this.setState({
          game_state: data,
          state: data.game_over ? GameStates.GAME_OVER : GameStates.RUNNING,
        });
        break;
      case 'player':
        this.setState({players: data.players});
        break;
      case 'rights':
        this.setState({creator: data.status === 'creator'});
        break;
      case 'message':
        this.setState({messages: this.state.messages.concat(
          [{msg_type: MessageType.MESSAGE, msg: data.msg}])});
        break;
      case 'error':
        this.setState({messages: this.state.messages.concat(
          [{msg_type: MessageType.ERROR, msg: data.msg}])});
        break;
      case 'management':
        this.setState({waiting_for: data.waiting_for});
        break;
      default:
        alert('David screwed up lol');
    }
  }
}

const container = document.getElementsByClassName('game')[0];
const root = createRoot(container!);
root.render(<Game />);
