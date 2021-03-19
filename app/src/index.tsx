import React, {FormEvent} from 'react';
import ReactDOM from 'react-dom';
import './index.css';

let websocket : WebSocket;

function Card(props : any) {
  const card = props.card;
  let text, color;
  switch (card.type) {
    case 'wizard':
      text = 'Zauberer';
      break;
    case 'fool':
      text = 'Narr';
      break;
    case 'number':
      text = card.number;
      color = card.color;
      break;
    default:
      alert('David screwed up lol');
  }
  return (
    <button className={'card ' + color + (props.trump ? ' trump' : '')}
            onClick={props.onClick}>
      { text }
      { card.owner && props.withOwner && <br /> }
      { card.owner && props.withOwner && card.owner }
    </button>
  );
}

function Table(props : any) {
  let cards = props.cards.map((card : any) =>
    <Card card={card} withOwner={true} trump={false} />
  );
  return (
    <div id='table'>
      <Card card={props.trump} trump={true} />
      {cards}
    </div>
  );
}

class Hand extends React.Component<any, any> {
  onClick(card : any) {
    websocket.send(JSON.stringify({action: 'play_card', ...card}));
  }
  render() {
    let cards = this.props.cards.map((card : any) =>
      <Card card={card} withOwner={false} trump={false} onClick={() => this.onClick(card)}/>
    );
    return (
      <div id='hand'>
        {cards}
      </div>
    );
  }
}

function UserList(props : any) {
  let tricks = 0;
  const players = props.players.map((user : any) => {
      tricks += user.announcement > 0 ? user.announcement : 0;
      return <li key={user.name} className={user.turn ? "turn" : undefined}>
               {user.name}
               {user.announcement > -1 && " (" + user.tricks + " von " + user.announcement + ") "}
               &nbsp;({user.score})
             </li>
    }
  );
  return (
    <div className="users">
      <h3>Users</h3>
      <ul id="userlist">{players}</ul>
      <p id="trick-count">{tricks} von {props.round}</p>
    </div>
  );
}

function MessageList(props : any) {
  const messages = props.messages.map((message : Message) =>
    <li className={(message.msg_type === MessageType.ERROR ? "error": undefined) }
      key={message.msg}>{message.msg}</li>
  );
  return (
    <div className="messages">
      <h3>Messages</h3>
      <ul id='messageList'>{messages}</ul>
    </div>
  );
}

class JoinUI extends React.Component<{onMessage: Function}, { value: string}> {
  onMessage : any;
  state = { value: '' };

  handleJoin(event : FormEvent) {
    event.preventDefault();
    const ws = new WebSocket('ws://127.0.0.1:6791');
    ws.onopen = this.onOpen.bind(this);
    ws.onmessage = this.onMessage;

    websocket = ws;
  }

  handleChange(event : FormEvent<HTMLInputElement>) {
    this.setState({value: event.currentTarget.value});
  }

  onOpen() {
    websocket.send(JSON.stringify({action: 'join', name: this.state.value}));
  }

  render() {
    this.onMessage = this.props.onMessage;
    return (
      <form className='join' onSubmit={this.handleJoin.bind(this)}>
        <input type='text' onChange={this.handleChange.bind(this)}
                         value={this.state.value}
                         placeholder='Name' />
        <input type='submit' value='Join' />
      </form>
    );
  }
}

class AnnounceUI extends React.Component<{}, {value: string}> {
  state = {value: ''};

  handleAnnounce(event : FormEvent) {
    event.preventDefault();
    websocket.send(JSON.stringify({action: 'announce', announcement: parseInt(this.state.value)}));
  }

  handleChange(event : FormEvent<HTMLInputElement>) {
    this.setState({value: event.currentTarget.value});
  }

  render() {
    return (
      <form className='announce' onSubmit={this.handleAnnounce.bind(this)}>
        <input type='text' onChange={this.handleChange.bind(this)}
                         value={this.state.value}
                         placeholder='Announcement' />
        <input type='submit' value='Announce' />
      </form>
    );
  }
}

interface GameScreenProps {
  game_state : any;
  players : any;
  messages : Message[];

}

class GameScreen extends React.Component<GameScreenProps, {}> {

  render() {
    return [
        <div className='main'>
          {this.props.game_state.announcing && <AnnounceUI />}
          <Table trump={this.props.game_state.trump} cards={this.props.game_state.table} />
          <Hand cards={this.props.game_state.hand} />
        </div>,
        <div className='controls right'>
          <UserList round={this.props.game_state.round} players={this.props.players} />
          <MessageList messages={this.props.messages} />
        </div>
    ];
  }
}

function ScoreBoard(props : {players: {score: number, name: string}[]}) {
  props.players.sort((a, b) => a.score - b.score);
  let place = 1;
  const table_entries = props.players.map((player) => {
    return <tr><td>{place++}</td><td>{player.name}</td><td>{player.score}</td></tr>
  });
  return (
    <table className="score-board">
      <th>Place</th><th>Name</th><th>Score</th>
      {table_entries}
    </table>
  );
}

class WaitingRoomScreen extends React.Component<any, any> {
  onClick(event : FormEvent) {
    event.preventDefault();
    websocket.send(JSON.stringify({action: 'start_game'}));
  }

  render() {
    let winners = "";
    if (this.props.game_over) {
      this.props.players.sort((a : any, b: any) => a.score - b.score);
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
              <ScoreBoard players={this.props.players} /> }
          { this.props.creator &&
              <button  className="center" id="start_game"
                  onClick={this.onClick.bind(this)}>(Re)start game</button> }
        </div>
      </div>
    );
  }
}

enum MessageType {
  MESSAGE,
  ERROR,
}

interface Message {
  msg_type : MessageType;
  msg : string;
}

class Game extends React.Component<any, any> {
  GameStates = {
    NONE: 0,
    JOINED: 1,
    RUNNING: 2,
    GAME_OVER: 3,
  }

  constructor(props : any) {
    super(props);
    this.state = {
      name: '',
      creator: false,
      running: false,
      players: null,
      state: this.GameStates.NONE,
      game_state: null,
      messages: [],
    };
  }

  render() {
    switch (this.state.state) {
      case this.GameStates.NONE:
        return (
          <JoinUI
            onMessage={(event : MessageEvent) => this.onMessage(event)} />
        );
      case this.GameStates.JOINED:
        return (
          <WaitingRoomScreen
            players={this.state.players}
            creator={this.state.creator}
            game_over={false} />
        );
      case this.GameStates.RUNNING:
        if (!this.state.players || !this.state.game_state) {
          return <div />;
        }
        return (
          <GameScreen
            players={this.state.players}
            messages={this.state.messages}
            game_state={this.state.game_state} />
        );
      case this.GameStates.GAME_OVER:
        return (
          <WaitingRoomScreen
            players={this.state.players}
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
          messages: this.state.messages.concat(['Joined game!']),
          state: this.GameStates.JOINED,
        });
        break;
      case 'state':
        this.setState({
          game_state: data,
          state: data.game_over ? this.GameStates.GAME_OVER : this.GameStates.RUNNING,
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
        /* TODO */
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
