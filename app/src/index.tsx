import React, {FormEvent} from 'react';
import ReactDOM from 'react-dom';
import {username, websocket, Message, MessageType, Card, CardType, AnnounceUI, HandUI, TableUI,
  UserListUI, MessageListUI, ScoreBoardUI, JoinUI, ChooseTrumpUI} from './UIElements'
import './index.css';

interface Player {
  name : string;
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
    let myTurn = curPlayer && curPlayer.name == username;
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
          {this.props.game_state.choosing_trump == username && <ChooseTrumpUI />}
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
  creator : boolean;
}
class WaitingRoomScreen extends React.Component<WaitingRoomScreenProps> {
  onClick(event : FormEvent) {
    event.preventDefault();
    websocket.send(JSON.stringify({action: 'start_game'}));
  }

  render() {
    let winners = "";
    if (this.props.game_over) {
      this.props.players.sort((a : Player, b: Player) => a.score - b.score);
      winners = this.props.players[0].name;
      let i;
      for (i = 1; i < this.props.players.length; ++i) {
        if (this.props.players[0].score !== this.props.players[i].score) {
          break;
        }
        winners += ", " + this.props.players[i].name;
      }
      if (i > 1) {
        winners = winners + " win the game!";
      } else {
        winners = winners + " wins the game!";
      }
    }
    return (
      <div className='pyro-container'>
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
    };
  }

  render() {
    switch (this.state.state) {
      case GameStates.NONE:
        return (
          <JoinUI
            onMessage={(event : MessageEvent) => this.onMessage(event)} />
        );
      case GameStates.JOINED:
        return (
          <WaitingRoomScreen
            players={this.state.players ?? []}
            creator={this.state.creator}
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
            creator={this.state.creator}
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


ReactDOM.render(
  <Game />,
  document.getElementsByClassName('game')[0]
);
