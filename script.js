
var ws, username,
    initialized = false,
    game_over = false,
    players = null,
    round = 0;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Content loaded');
    var form = document.getElementById('join');
    form.addEventListener('submit', function (event) {
        var data = new FormData(form);
        username = data.get('name');
        ws = new WebSocket("ws://127.0.0.1:6791/");
        ws.onopen = onOpen;
        ws.onmessage = onMessage;

        event.preventDefault();
    });
    var announce = document.getElementById('announce');
    announce.addEventListener('submit', function (event) {
        var data = new FormData(announce);
        ws.send(JSON.stringify({action: 'announce', announcement: parseInt(data.get('count'))}));
        event.preventDefault();
    });
    var trump = document.getElementById('choose_trump');
    trump.addEventListener('submit', function (event) {
        var data = new FormData(trump);
        ws.send(JSON.stringify({action: 'choose_trump', color: data.get('color')}));
        event.preventDefault();
    });
});

function onMessage(event) {
    data = JSON.parse(event.data);
    switch (data.type) {
        case 'joined':
            initGame();
            break;
        case 'state':
            console.log('Got state message');
            renderState(data);
            break;
        case 'player':
            console.log('Got user message');
            createUserList(data.players);
            break;
        case 'rights':
            if (data.status == 'creator') {
                var start_game = document.getElementById('start_game');
                start_game.addEventListener('click', () => {
                    ws.send(JSON.stringify({action: 'start_game'}));
                });
                start_game.classList.remove('hidden');
            }
            break;
        case 'message':
            console.log('Got message: ' + data.msg)
            addMessage(data.msg);
            break;
        case 'error':
            console.log('Got error: ' + data.msg)
            addMessage(data.msg, true);
            break
        case 'management':
            manage(data);
            break;
    }
}

function manage(data) {
    var waiting_for = data.waiting_for;
    if (waiting_for.length > 0) {
        document.getElementsByClassName('waiting')[0].classList.remove('hidden');
        var waiting_list = document.getElementById('waiting-list');
        waiting_list.innerHTML = "Waiting for: ";
        var names = waiting_for.join(', ');
        waiting_list.appendChild(document.createTextNode(names));
    } else {
        document.getElementsByClassName('waiting')[0].classList.add('hidden');
    }
}

function onCardClicked(event) {
    var card = event.target;
    var card_type = card.getAttribute('data-type');
    if (card_type == 'number') {
        ws.send(JSON.stringify({action: 'play_card', type: card_type,
                    color: card.getAttribute('data-color'),
                    number: parseInt(card.getAttribute('data-number'))}));
    } else {
        ws.send(JSON.stringify({action: 'play_card', type: card_type }));
    }
}

function createCard(card, hand=true) {
    var cardnode = document.createElement('button');
    cardnode.setAttribute('data-type', card.type);
    if (card.type == 'number') {
        cardnode.setAttribute('data-color', card.color);
        cardnode.setAttribute('data-number', card.number);
    }
    var text;
    switch (card.type) {
        case 'wizard':
            text = 'Zauberer';
            break;
        case 'fool':
            text = 'Narr';
            break;
        case 'number':
            text = card.number;
            cardnode.classList.add(card.color);
            break
    }
    cardnode.appendChild(document.createTextNode(text));
    if (hand) {
        cardnode.addEventListener('click', onCardClicked);
    } else if (card.owner) {
        cardnode.appendChild(document.createElement('br'));
        cardnode.appendChild(document.createTextNode(card.owner));
    }
    cardnode.classList.add("card");
    return cardnode;
}

function tableEntry(name, score, place) {
    var row = document.createElement('tr');
    var tplace = document.createElement('td');
    var tname = document.createElement('td');
    var tscore = document.createElement('td');
    tplace.appendChild(document.createTextNode(place));
    tname.appendChild(document.createTextNode(name));
    tscore.appendChild(document.createTextNode(score));
    row.appendChild(tplace);
    row.appendChild(tname);
    row.appendChild(tscore);
    return row;
}

function renderScoreBoard() {
    var score_board = document.getElementsByClassName('score-board')[0];
    score_board.innerHTML = "<tr><th>Place</th><th>Name</th><th>Score</th></tr>";
    var sorted = players.sort((a, b) => b.score - a.score);
    console.log('game_over: ' + sorted);
    var winners = [sorted[0].name];
    for (var i = 0; i < sorted.length; ++i) {
        if (i > 0 && sorted[i].score == sorted[0].score) {
            winners.push(sorted[i].name);
        }
        score_board.appendChild(tableEntry(sorted[i].name, sorted[i].score, i + 1));
    }
    return winners;
}

function renderGameOver() {
    var winner = document.getElementsByClassName('winner')[0];
    winner.innerHTML = '';
    var winners = renderScoreBoard();
    var text;
    if (winners.length > 1) {
        text = winners.join(', ');
        text += ' win the game!';
    } else {
        text = winners[0] + ' wins the game!';
    }
    winner.appendChild(document.createTextNode(text));
    document.getElementById('gameover').classList.add('pyro');
    document.getElementsByClassName('pyro-container')[0].classList.remove('hidden');
}

function renderState(state) {
    var table = document.getElementById('table');
    var hand = document.getElementById('hand');
    round = state.round;
    table.innerHTML = '';
    hand.innerHTML = '';
    game_over = state.game_over;
    if (game_over) {
        renderGameOver();
    } else {
        document.getElementsByClassName('pyro-container')[0].classList.add('hidden');
    }
    if (state.trump) {
        var trump = createCard(state.trump, false);
        trump.classList.add('trump');
        table.appendChild(trump);
    }
    state.table.forEach((card) => {
        table.appendChild(createCard(card, false));
    });
    state.hand.forEach((card) => {
        hand.appendChild(createCard(card));
    });
    if (state.announcing) {
        document.getElementById('announce').classList.remove('hidden');
    } else {
        document.getElementById('announce').classList.add('hidden');
    }
    if (state.choosing_trump == username) {
        document.getElementById('choose_trump').classList.remove('hidden');
    } else {
        document.getElementById('choose_trump').classList.add('hidden');
    }
}

function addMessage(msg, is_error) {
    var messages = document.getElementById('messagelist'),
        message = document.createElement('li'),
        content = document.createTextNode(msg);
    if (is_error) {
        message.className = 'error';
    }
    message.appendChild(content);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

function createUserList(users) {
    console.log('creating user list');
    players = users;
    if (game_over) {
        renderGameOver();
    } else if (!document.getElementsByClassName('pyro-container')[0].classList.contains('hidden')) {
        renderScoreBoard();
    }
    var list = document.getElementById('userlist');
    list.innerText = '';
    var total = 0;
    users.forEach((user) => {
        var li = document.createElement('li');
        var text = user.name;
        if (user.turn) {
            li.classList.add('turn');
        }
        if (user.announcement != -1) {
            text += " (" + user.tricks + " von " + user.announcement + ")";
            total += user.announcement;
        }
        text += " (" + user.score + ")";
        li.appendChild(document.createTextNode(text));
        list.appendChild(li);
    });
    document.getElementById('trick-count').innerHTML = total + " von " + round;
}

function onOpen() {
    console.log('setting name: ' + username);
    ws.send(JSON.stringify({action: "join", name: username}));
}

function initGame() {
    initialized = true;
    var form = document.getElementById('join');
    form.className = 'join hidden';
    document.getElementsByClassName('pyro-container')[0].classList.remove('hidden');
}
