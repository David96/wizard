(this.webpackJsonpapp=this.webpackJsonpapp||[]).push([[0],{14:function(e,t,s){},15:function(e,t,s){"use strict";s.r(t);var a,n,r,i=s(2),c=s(3),o=s(5),l=s(4),u=s(1),h=s.n(u),p=s(7),j=s.n(p),d=s(8),m=s(0);function b(e){var t,s,a=e.card;switch(a.type){case r.WIZARD:t="Zauberer";break;case r.FOOL:t="Narr";break;case r.NUMBER:t=a.number,s=a.color;break;default:alert("David screwed up lol")}return Object(m.jsxs)("button",{className:"card "+s+(e.trump?" trump":""),onClick:e.onClick,children:[t,a.owner&&e.withOwner&&Object(m.jsx)("br",{}),a.owner&&e.withOwner&&a.owner]})}function O(e){var t=e.cards.map((function(e){return Object(m.jsx)(b,{card:e,withOwner:!0,trump:!1})}));return Object(m.jsxs)("div",{id:"table",children:[e.trump&&Object(m.jsx)(b,{card:e.trump,trump:!0}),t]})}!function(e){e[e.MESSAGE=0]="MESSAGE",e[e.ERROR=1]="ERROR"}(n||(n={})),function(e){e.WIZARD="wizard",e.FOOL="fool",e.NUMBER="number"}(r||(r={}));var v=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){return Object(i.a)(this,s),t.apply(this,arguments)}return Object(c.a)(s,[{key:"onClick",value:function(e){a.send(JSON.stringify(Object(d.a)({action:"play_card"},e)))}},{key:"render",value:function(){var e=this,t=this.props.cards.map((function(t){return Object(m.jsx)(b,{card:t,withOwner:!1,trump:!1,onClick:function(){return e.onClick(t)}})}));return Object(m.jsx)("div",{id:"hand",children:t})}}]),s}(h.a.Component);function g(e){var t=0,s=e.players.map((function(e){return t+=e.announcement>0?e.announcement:0,Object(m.jsxs)("li",{className:e.turn?"turn":void 0,children:[e.name,e.announcement>-1&&" ("+e.tricks+" von "+e.announcement+") ","\xa0(",e.score,")"]},e.name)}));return Object(m.jsxs)("div",{className:"users",children:[Object(m.jsx)("h3",{children:"Users"}),Object(m.jsx)("ul",{id:"userlist",children:s}),Object(m.jsxs)("p",{id:"trick-count",children:[t," von ",e.round]})]})}function f(e){var t=e.messages.map((function(e){return Object(m.jsx)("li",{className:e.msg_type===n.ERROR?"error":void 0,children:e.msg},e.msg)}));return Object(m.jsxs)("div",{className:"messages",children:[Object(m.jsx)("h3",{children:"Messages"}),Object(m.jsx)("ul",{id:"messageList",children:t})]})}var y=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){var e;Object(i.a)(this,s);for(var a=arguments.length,n=new Array(a),r=0;r<a;r++)n[r]=arguments[r];return(e=t.call.apply(t,[this].concat(n))).onMessage=void 0,e.state={value:""},e}return Object(c.a)(s,[{key:"handleJoin",value:function(e){e.preventDefault();var t=new WebSocket("ws://127.0.0.1:6791");t.onopen=this.onOpen.bind(this),t.onmessage=this.onMessage,a=t}},{key:"handleChange",value:function(e){this.setState({value:e.currentTarget.value})}},{key:"onOpen",value:function(){a.send(JSON.stringify({action:"join",name:this.state.value}))}},{key:"render",value:function(){return this.onMessage=this.props.onMessage,Object(m.jsxs)("form",{className:"join",onSubmit:this.handleJoin.bind(this),children:[Object(m.jsx)("input",{type:"text",onChange:this.handleChange.bind(this),value:this.state.value,placeholder:"Name"}),Object(m.jsx)("input",{type:"submit",value:"Join"})]})}}]),s}(h.a.Component),x=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){var e;Object(i.a)(this,s);for(var a=arguments.length,n=new Array(a),r=0;r<a;r++)n[r]=arguments[r];return(e=t.call.apply(t,[this].concat(n))).state={value:"red"},e}return Object(c.a)(s,[{key:"handleChoose",value:function(e){e.preventDefault(),a.send(JSON.stringify({action:"choose_trump",color:this.state.value}))}},{key:"handleChange",value:function(e){this.setState({value:e.currentTarget.value})}},{key:"render",value:function(){return Object(m.jsxs)("form",{id:"choose_trump",onSubmit:this.handleChoose.bind(this),children:[Object(m.jsxs)("select",{id:"color",name:"color",value:this.state.value,onChange:this.handleChange.bind(this),children:[Object(m.jsx)("option",{value:"red",children:"Red"}),Object(m.jsx)("option",{value:"yellow",children:"Yellow"}),Object(m.jsx)("option",{value:"green",children:"Green"}),Object(m.jsx)("option",{value:"blue",children:"Blue"})]}),Object(m.jsx)("input",{type:"submit",value:"Choose"})]})}}]),s}(h.a.Component),k=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){var e;Object(i.a)(this,s);for(var a=arguments.length,n=new Array(a),r=0;r<a;r++)n[r]=arguments[r];return(e=t.call.apply(t,[this].concat(n))).state={value:""},e}return Object(c.a)(s,[{key:"handleAnnounce",value:function(e){e.preventDefault(),a.send(JSON.stringify({action:"announce",announcement:parseInt(this.state.value)}))}},{key:"handleChange",value:function(e){this.setState({value:e.currentTarget.value})}},{key:"render",value:function(){return Object(m.jsxs)("form",{className:"announce",onSubmit:this.handleAnnounce.bind(this),children:[Object(m.jsx)("input",{type:"text",onChange:this.handleChange.bind(this),value:this.state.value,placeholder:"Announcement"}),Object(m.jsx)("input",{type:"submit",value:"Announce"})]})}}]),s}(h.a.Component);function N(e){e.players.sort((function(e,t){return t.score-e.score}));var t=1,s=e.players.map((function(e){return Object(m.jsxs)("tr",{children:[Object(m.jsx)("td",{children:t++}),Object(m.jsx)("td",{children:e.name}),Object(m.jsx)("td",{children:e.score})]})}));return Object(m.jsxs)("table",{className:"score-board",children:[Object(m.jsx)("th",{children:"Place"}),Object(m.jsx)("th",{children:"Name"}),Object(m.jsx)("th",{children:"Score"}),s]})}s(14);var w=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){return Object(i.a)(this,s),t.apply(this,arguments)}return Object(c.a)(s,[{key:"kick",value:function(e){e.forEach((function(e){a.send(JSON.stringify({action:"kick",user:e}))}))}},{key:"render",value:function(){var e=this;return[Object(m.jsxs)("div",{className:"main",children:[this.props.waiting_for&&this.props.waiting_for.length>0&&Object(m.jsxs)("div",{className:"waiting",children:[Object(m.jsx)("p",{id:"waiting-list",children:this.props.waiting_for}),this.props.creator&&Object(m.jsx)("button",{className:"center",id:"kick",onClick:function(){return e.kick(e.props.waiting_for)},children:"Kick em"})]}),this.props.game_state.announcing&&Object(m.jsx)(k,{}),this.props.game_state.choosing_trump&&Object(m.jsx)(x,{}),Object(m.jsx)(O,{trump:this.props.game_state.trump,cards:this.props.game_state.table}),Object(m.jsx)(v,{cards:this.props.game_state.hand})]}),Object(m.jsxs)("div",{className:"controls right",children:[Object(m.jsx)(g,{round:this.props.game_state.round,players:this.props.players}),Object(m.jsx)(f,{messages:this.props.messages})]})]}}]),s}(h.a.Component),S=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(){return Object(i.a)(this,s),t.apply(this,arguments)}return Object(c.a)(s,[{key:"onClick",value:function(e){e.preventDefault(),a.send(JSON.stringify({action:"start_game"}))}},{key:"render",value:function(){var e="";if(this.props.game_over){var t;for(this.props.players.sort((function(e,t){return e.score-t.score})),e=this.props.players[0].name,t=1;t<this.props.players.length&&this.props.players[0].score===this.props.players[t].score;++t)e+=", "+this.props.players[t].name;e+=t>1?" win the game!":" wins the game!"}return Object(m.jsx)("div",{className:"pyro-container",children:Object(m.jsxs)("div",{id:"gameover",className:this.props.game_over?"pyro":void 0,children:[Object(m.jsx)("div",{className:"before"}),Object(m.jsx)("div",{className:"after"}),Object(m.jsx)("h1",{className:"winner",children:e}),this.props.players&&Object(m.jsx)(N,{players:this.props.players}),this.props.creator&&Object(m.jsx)("button",{className:"center",id:"start_game",onClick:this.onClick.bind(this),children:"(Re)start game"})]})})}}]),s}(h.a.Component),_=function(e){Object(o.a)(s,e);var t=Object(l.a)(s);function s(e){var a;return Object(i.a)(this,s),(a=t.call(this,e)).GameStates={NONE:0,JOINED:1,RUNNING:2,GAME_OVER:3},a.state={name:"",creator:!1,running:!1,players:null,state:a.GameStates.NONE,game_state:null,waiting_for:null,messages:[]},a}return Object(c.a)(s,[{key:"render",value:function(){var e=this;switch(this.state.state){case this.GameStates.NONE:return Object(m.jsx)(y,{onMessage:function(t){return e.onMessage(t)}});case this.GameStates.JOINED:return Object(m.jsx)(S,{players:this.state.players,creator:this.state.creator,game_over:!1});case this.GameStates.RUNNING:return this.state.players&&this.state.game_state?Object(m.jsx)(w,{players:this.state.players,messages:this.state.messages,game_state:this.state.game_state,waiting_for:this.state.waiting_for,creator:this.state.creator}):Object(m.jsx)("div",{});case this.GameStates.GAME_OVER:return Object(m.jsx)(S,{players:this.state.players,creator:this.state.creator,game_over:!0});default:return Object(m.jsx)("div",{children:"Unsorpported state"})}}},{key:"onMessage",value:function(e){var t=JSON.parse(e.data);switch(t.type){case"joined":this.setState({messages:this.state.messages.concat(["Joined game!"]),state:this.GameStates.JOINED});break;case"state":this.setState({game_state:t,state:t.game_over?this.GameStates.GAME_OVER:this.GameStates.RUNNING});break;case"player":this.setState({players:t.players});break;case"rights":this.setState({creator:"creator"===t.status});break;case"message":this.setState({messages:this.state.messages.concat([{msg_type:n.MESSAGE,msg:t.msg}])});break;case"error":this.setState({messages:this.state.messages.concat([{msg_type:n.ERROR,msg:t.msg}])});break;case"management":this.setState({waiting_for:t.waiting_for});break;default:alert("David screwed up lol")}}}]),s}(h.a.Component);j.a.render(Object(m.jsx)(_,{}),document.getElementsByClassName("game")[0])}},[[15,1,2]]]);
//# sourceMappingURL=main.6715f874.chunk.js.map