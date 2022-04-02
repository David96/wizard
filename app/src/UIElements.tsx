import React, {FormEvent} from 'react';

export let websocket : WebSocket;
export let username : string;

export enum MessageType {
  MESSAGE,
  ERROR,
}

export enum CardType {
  WIZARD = "wizard",
  FOOL = "fool",
  NUMBER = "number",
}

export interface Message {
  msg_type : MessageType;
  msg : string;
}

export interface Card {
  type : CardType;
  number : Number;
  color : string;
  owner : string;
}

export interface CardUIProps {
  card : Card;
  withOwner? : Boolean;
  onClick? : React.MouseEventHandler;
}

export function CardUI(props : CardUIProps) {
  const card = props.card;
  let text, color;
  switch (card.type) {
    case CardType.WIZARD:
      text = 'Z';
      // This might happen if someone choses a trump color, the wizard's color is then used to
      // indicate that
      if (card.color) {
        color = card.color;
      }
      break;
    case CardType.FOOL:
      text = 'N';
      break;
    case CardType.NUMBER:
      text = card.number;
      color = card.color;
      break;
    default:
      alert('David screwed up lol');
  }
  return (
    <button className={'card ' + color}
            onClick={props.onClick}>
      { text }
      { card.owner && props.withOwner && <br />}
      { card.owner && props.withOwner && <span className='owner'>{card.owner}</span> }
    </button>
  );
}

export function TableUI(props : any) {
  let cards = props.cards.map((card : any) =>
    <CardUI card={card} withOwner={true} />
  );
  return (
    <div id='table'>
    <div className="trump">{props.trump && <CardUI card={props.trump} />}</div>
      {cards}
    </div>
  );
}

export class HandUI extends React.Component<any, any> {
  onClick(card : Card) {
    websocket.send(JSON.stringify({action: 'play_card', ...card}));
  }
  render() {
    let cards = this.props.cards.map((card : any) =>
      <CardUI card={card} withOwner={false} onClick={() => this.onClick(card)}/>
    );
    return (
      <div id='hand'>
        {cards}
      </div>
    );
  }
}

export function UserListUI(props : any) {
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

export function MessageListUI(props : any) {
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

export class JoinUI extends React.Component<{onMessage: Function}, { value: string}> {
  onMessage : any;
  state = { value: '' };

  handleJoin(event : FormEvent) {
    event.preventDefault();
    this.join();
  }

  join() {
    const ws = new WebSocket('ws://127.0.0.1:6791');
    ws.onopen = this.onOpen.bind(this);
    ws.onmessage = this.onMessage;

    ws.onerror = (e) => {
      console.log("Websocket error: " + e);
      ws.close();
    }

    ws.onclose = (ev: CloseEvent) => {
      console.log("Websocket closed: " + ev.reason);
      console.log("Reconnecting…");
      this.join();
    };

    websocket = ws;
  }

  handleChange(event : FormEvent<HTMLInputElement>) {
    this.setState({value: event.currentTarget.value});
  }

  onOpen() {
    username = this.state.value;
    websocket.send(JSON.stringify({action: 'join', name: username}));
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

export class ChooseTrumpUI extends React.Component<{}, {value: string}> {
  state = {value: 'red'};

  handleChoose(event : FormEvent) {
    event.preventDefault();
    websocket.send(JSON.stringify({action: 'choose_trump', color: this.state.value}));
  }

  handleChange(event : FormEvent<HTMLSelectElement>) {
    this.setState({value: event.currentTarget.value});
  }

  render() {
    return (
        <form className='choose_trump' onSubmit={this.handleChoose.bind(this)}>
          <select id='color' name='color' value={this.state.value}
                onChange={this.handleChange.bind(this)}>
            <option value='red'>Red</option>
            <option value='yellow'>Yellow</option>
            <option value='green'>Green</option>
            <option value='blue'>Blue</option>
          </select>
          <input type='submit' value='Choose' />
        </form>
    );
  }
}

export class AnnounceUI extends React.Component<{}, {value: string}> {
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
        <input type='submit' value='Go' />
      </form>
    );
  }
}

export function ScoreBoardUI(props : {players: {score: number, name: string}[]}) {
  props.players.sort((a, b) => b.score - a.score);
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
