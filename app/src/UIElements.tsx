import React, {FormEvent} from 'react';
import {websocket} from './index';

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
  let text, style, suit;
  switch (card.type) {
    case CardType.WIZARD:
      text = '✦';
      suit = 'wizard';
      // The trump wizard gets a color when someone chose one
      style = card.color ? card.color : 'wizard';
      break;
    case CardType.FOOL:
      text = '●';
      suit = 'fool';
      style = 'fool';
      break;
    case CardType.NUMBER:
      text = card.number;
      suit = card.color;
      style = card.color;
      break;
    default:
      alert('David screwed up lol');
  }
  return (
    <button className={'card ' + style}
            onClick={props.onClick}>
      <span className='suit'>{suit}</span>
      { text }
      { card.owner && props.withOwner && <span className='owner'>{card.owner}</span> }
    </button>
  );
}

export function TableUI(props : any) {
  return (
    <div className='table-area'>
      <div className='trump-slot'>
        <div className='label'>Trump</div>
        {props.trump ? <CardUI card={props.trump} />
                     : <div className='card card-empty' />}
      </div>
      <div className='felt'>
        {props.cards.map((card : any, i : number) =>
          <CardUI key={i} card={card} withOwner={true} />
        )}
      </div>
    </div>
  );
}

export class HandUI extends React.Component<any, any> {
  onClick(card : Card) {
    websocket.send(JSON.stringify({action: 'play_card', ...card}));
  }
  render() {
    let cards = this.props.cards.map((card : any, i : number) =>
      <CardUI key={i} card={card} withOwner={false} onClick={() => this.onClick(card)}/>
    );
    return (
      <div className='hand'>
        {cards}
      </div>
    );
  }
}

export function UserListUI(props : any) {
  let tricks = 0;
  const players = props.players.map((user : any, i : number) => {
      if (user.active) {
        tricks += user.announcement > 0 ? user.announcement : 0;
      }
      let className = undefined;
      if (user.turn) {
        className = "turn";
      } else if (!user.active) {
        className = "inactive";
      }
      return <li key={i} className={className}>
               {user.name}{!user.active && " (left)"}
               {user.announcement > -1 && " (" + user.tricks + " / " + user.announcement + ") "}
               <span className='score'>{user.score}</span>
             </li>
    }
  );
  return (
    <div className="users-block">
      <h3>Users</h3>
      <ul className="users">{players}</ul>
      <div className="trickcount">Tricks announced: {tricks} / {props.round}</div>
    </div>
  );
}

export function MessageListUI(props : any) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const stickToBottom = React.useRef(true);

  // Remember whether the user is (almost) at the bottom
  const onScroll = () => {
    const el = listRef.current;
    if (el) {
      stickToBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    }
  };

  // After every new message, jump to the bottom (unless the user scrolled up)
  React.useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [props.messages.length]);

  const messages = props.messages.map((message : Message, i : number) =>
    <li className={message.msg_type === MessageType.ERROR ? "error" : undefined}
      key={i}>{message.msg}</li>
  );
  return (
    <div className="messages-block">
      <h3>Messages</h3>
      <ul id='messageList' ref={listRef} onScroll={onScroll}>{messages}</ul>
    </div>
  );
}

export class JoinUI extends React.Component<{error? : string, disconnected? : boolean},
                                            {username: string, roomname: string}> {
  constructor(props : {}) {
    super(props);
    this.state = {
      username: localStorage.getItem('username') ?? '',
      roomname: ''
    }
  }

  handleJoin(event : FormEvent) {
    event.preventDefault();
    this.joinRoom(this.state.roomname);
  }

  joinRoom(room : string) {
    username = this.state.username;
    localStorage.setItem('username', username);
    websocket.send(JSON.stringify({action: 'join', name: username, room: room}));
  }

  handleCreate(event : FormEvent) {
    event.preventDefault();
    // Creating the room instantly joins, so set the global username here as well
    // roomname is set in index.tsx, since it's unknown at this point
    username = this.state.username;
    localStorage.setItem('username', this.state.username);
    websocket.send(JSON.stringify({action: 'create_room', name: this.state.username}));
  }

  handleUserChange(event : FormEvent<HTMLInputElement>) {
    this.setState({username: event.currentTarget.value});
  }

  render() {
    let status = 'Connected';
    if (this.props.disconnected) {
      status = 'Reconnecting…';
    }
    return (
      <div className='join-screen'>
        <div className='panel'>
          <div className={this.props.disconnected ? 'status reconnecting' : 'status'}>
            {status}
          </div>
          <h1>Wizard</h1>
          <form className='join' onSubmit={this.handleJoin.bind(this)}>
            <div className='field'>
              <label htmlFor='username'>Your name</label>
              <input type='text' id='username' maxLength={20} spellCheck={false}
                onChange={(event) => this.setState({username: event.currentTarget.value})}
                value={this.state.username} placeholder='Name' />
            </div>
            <div className='field'>
              <label htmlFor='room'>Room code</label>
              <input type='text' id='room' className='room' maxLength={6} spellCheck={false}
                onChange={(event) => this.setState({roomname: event.currentTarget.value.toUpperCase()})}
                value={this.state.roomname} placeholder='ABC123' />
            </div>
            <button className='primary' disabled={!this.state.username || !this.state.roomname}>
              Join room</button>
          </form>
          <div className='divider'>● or ●</div>
          <form className='create' onSubmit={this.handleCreate.bind(this)}>
            <button className='ghost' disabled={!this.state.username}>
              Create a new room</button>
          </form>
          {this.props.error &&
            <div className='error-box'>⚠ {this.props.error}</div>}
        </div>
      </div>
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
        <form className='panel choose_trump' onSubmit={this.handleChoose.bind(this)}>
          <h3>Choose the trump color</h3>
          <select id='color' name='color' value={this.state.value}
                onChange={this.handleChange.bind(this)}>
            <option value='red'>Red</option>
            <option value='yellow'>Yellow</option>
            <option value='green'>Green</option>
            <option value='blue'>Blue</option>
          </select>
          <button className='primary' type='submit'>Choose</button>
        </form>
    );
  }
}

export class AnnounceUI extends React.Component<{players : any[], round : number},
                                               {value: string}> {
  state = {value: '0'};
  numInput = React.createRef<HTMLInputElement>();

  announcement() : number {
    return parseInt(this.state.value, 10);
  }

  invalidReason() : string {
    const value = this.announcement();
    if (this.state.value.trim() === '' || isNaN(value)) {
      return 'Enter a number';
    }
    if (value < 0) {
      return 'Must be 0 or more';
    }
    if (value > this.props.round) {
      return 'At most ' + this.props.round;
    }
    const others = this.props.players.filter((p : any) =>
      p.active && p.name !== username);
    const pending = others.filter((p : any) => p.announcement < 0);
    if (pending.length === 0) {
      // We are the last to announce: the total must not equal the round
      const sum = others.reduce((s : number, p : any) => s + p.announcement, 0);
      if (sum + value === this.props.round) {
        return 'Total would be ' + this.props.round + ' \u2014 not allowed';
      }
    }
    return '';
  }

  step(delta : number) {
    let value = this.announcement();
    if (isNaN(value)) {
      value = 0;
    }
    value = Math.max(0, Math.min(this.props.round, value + delta));
    this.setState({value: String(value)}, () => this.numInput.current?.select());
  }

  handleChange(event : FormEvent<HTMLInputElement>) {
    this.setState({value: event.currentTarget.value.replace(/[^0-9]/g, '')});
  }

  handleAnnounce(event : FormEvent) {
    event.preventDefault();
    if (this.invalidReason()) {
      return;
    }
    websocket.send(JSON.stringify({action: 'announce',
                                   announcement: this.announcement()}));
  }

  render() {
    const reason = this.invalidReason();
    return (
      <form className='panel announce' onSubmit={this.handleAnnounce.bind(this)}>
        <h3>Announce your tricks</h3>
        <div className='inputstep'>
          <button type='button' className='roundbtn'
                  onClick={() => this.step(-1)}>&minus;</button>
          <input className='numfield' type='text' inputMode='numeric'
                 ref={this.numInput} value={this.state.value}
                 onChange={this.handleChange.bind(this)} />
          <button type='button' className='roundbtn'
                  onClick={() => this.step(1)}>+</button>
        </div>
        <div className={'hint' + (reason ? ' bad' : '')}>
          {reason || 'Round ' + this.props.round + ' \u2014 how many tricks will you win?'}
        </div>
        <button className='primary' type='submit' disabled={!!reason}>Announce</button>
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
