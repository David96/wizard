
var ws, username,
    initialized = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Content loaded');
    var form = document.getElementById('join');
    form.addEventListener('submit', function (event) {
        var data = new FormData(form);
        username = data.get('name');
        ws = new WebSocket("ws://127.0.0.1:6790/");
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
        case 'state':
            console.log('Got state message');
            if (!initialized) {
                initGame();
            }
            renderState(data);
            break;
        case 'player':
            console.log('Got user message');
            createUserList(data.players);
            break;
        case 'message':
            console.log('Got message: ' + data.msg)
            addMessage(data.msg);
            break;
        case 'error':
            console.log('Got error: ' + data.msg)
            addMessage(data.msg, true);
            break
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

function renderState(state) {
    var table = document.getElementById('table');
    var hand = document.getElementById('hand');
    table.innerHTML = '';
    hand.innerHTML = '';
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
    var list = document.getElementById('userlist');
    list.innerText = '';
    users.forEach((user) => {
        var li = document.createElement('li');
        var text = user.name;
        if (user.turn) {
            li.classList.add('turn');
        }
        text += " (" + user.tricks + " von " + user.announcement + ")";
        text += " (" + user.score + ")";
        li.appendChild(document.createTextNode(text));
        list.appendChild(li);
    });
}

function onOpen() {
    console.log('setting name: ' + username);
    ws.send(JSON.stringify({action: "join", name: username}));
}

function initGame() {
    initialized = true;
    var form = document.getElementById('join');
    form.className = 'join hidden';
}
