import asyncio
import time
import random
import json

from game_room import GameRoom, Event

TYPE_CARD = 'number'
TYPE_WIZARD = 'wizard'
TYPE_FOOL = 'fool'

class Player:

    def __init__(self, name):
        self.name = name
        self.hand = []
        self.score = 0
        self.announcement = -1
        self.tricks = 0
        self.active = True

class Wizard:

    def __init__(self):
        self.ACTIONS = {
            'play_card': self.play_card,
            'announce': self.announce,
            'start_game': self.start_game
        }
        self.players = {}
        self.stack = []
        self.trump = None
        self.choosing_trump = None
        self.announcing = False

    def init(self, room):
        self.table = []
        self.room = room
        self.round = 0
        self.current_player = -1
        self.first_player = 0

    def add_player(self, name):
        if name in self.players:
            self.players[name].active = True
        else:
            self.players[name] = Player(name)
        return [Event(self.player_event, False, True), Event(self.state_event, True, False)]

    def remove_player(self, name):
        self.players[name].active = False

    # Events
    async def state_event(self, name):
        player = self.players[name]
        return json.dumps({
            'type': 'state',
            'table': self.table,
            'hand': player.hand,
            'trump': self.trump,
            'announcing': self.announcing,
            'choosing_trump': self.choosing_trump
        })

    async def player_event(self, _):
        return json.dumps({
            'type': 'player',
            'players': [{
                'name': player.name,
                'announcement': player.announcement,
                'score': player.score,
                'tricks': player.tricks,
                'turn': self.current_player > -1 and
                                player == self._sorted_players()[self.current_player]
            } for player in self._sorted_players()]
        })

    # Actions
    async def start_game(self, _, __):
        self.new_round()
        await self.room.fire_event('', Event(self.state_event, True, True))
        await self.room.fire_event('', Event(self.player_event, False, True))

    async def choose_trump(self, name, data):
        if name != self.choosing_trump:
            raise Exception('You dumb motherfucker are not supposed to choose the trump color!')
        self.trump = {'type': TYPE_CARD, 'color': data['color'], 'number': 0}
        self.choosing_trump = None
        del self.ACTIONS['choose_trump']
        await self.room.fire_event('', Event(self.state_event, True, True))
        await self.room.fire_event('', Event(self.player_event, False, True))

    async def play_card(self, name, data):
        if self.announcing or self.choosing_trump:
            raise Exception('God damn it, you aren\'t allowed to play a card right now!')
        if self.current_player < 0 or name != self._sorted_players()[self.current_player].name:
            print("%s, %s, %d" % (name, self._sorted_players(), self.current_player))
            raise Exception('It\'s not your turn, bitch')
        player = self.players[name]
        card = self._get_card(player, data)
        if not card:
            raise Exception('Damn, you don\'t even have that card.')
        if not self._is_card_allowed(card, player):
            raise Exception('Sadly, you are not allowed to play this card. Idiot.')
        player.hand.remove(card)
        self.table.append(card)
        self.current_player = (self.current_player + 1) % self._active_players()

        if self.current_player == self.first_player:
            await self.finish_trick()
            await asyncio.sleep(3)
            await self.new_trick()
        await self.room.fire_event('', Event(self.state_event, True, True))
        await self.room.fire_event('', Event(self.player_event, False, True))

    async def finish_trick(self):
        winner = self._get_trick_winner()
        self.players[winner].tricks += 1
        await self.room.send_message('%s wins the trick.' % winner)
        self.current_player = -1
        if len(self.players[winner].hand) == 0:
            await self.finish_round()
        await self.room.fire_event('', Event(self.state_event, True, True))
        await self.room.fire_event('', Event(self.player_event, False, True))

    async def new_trick(self):
        winner = self._get_trick_winner()
        self.current_player = self._sorted_players().index(self.players[winner])
        self.first_player = self.current_player
        self.table.clear()
        if len(self.players[winner].hand) == 0:
            self.new_round()

    async def finish_round(self):
        for player in self.players.values():
            if player.active:
                diff = abs(player.announcement - player.tricks)
                if diff == 0:
                    score = 20 + player.tricks * 10
                else:
                    score = -(diff * 10)
                player.score += score
                await self.room.send_message('%s makes %d points.' % (player.name, score))

    def new_round(self):
        self.round += 1
        self.table.clear()
        self.current_player = (self.round - 1) % self._active_players()
        self.first_player = self.current_player

        # Create stack of all cards
        self.stack.clear()
        for color in range(4):
            for i in range(1, 14):
                self.stack.append({'type': TYPE_CARD, 'color': self.cts(color), 'number': i})
            self.stack.append({'type': TYPE_WIZARD})
            self.stack.append({'type': TYPE_FOOL})

        if self.round * len(self.players) > len(self.stack):
            self.room.send_message('Game is over!')
            return

        # Hand out cards to players
        for player in self.players.values():
            player.announcement = -1
            player.tricks = 0
            sample = random.sample(self.stack, self.round)
            for card in sample:
                card['owner'] = player.name
                self.stack.remove(card)
            player.hand = sorted(sample, key=self._cmp_to_key(self._cmp_cards))

        # Choose a trump card
        if len(self.stack) > 0:
            trump_card = random.sample(self.stack, 1)[0]
            if trump_card['type'] == TYPE_WIZARD:
                prev_player = (self.current_player - 1) % self._active_players()
                self.choosing_trump = self._sorted_players()[prev_player].name
                self.ACTIONS['choose_trump'] = self.choose_trump
                self.trump = None
            else:
                self.trump = trump_card
        else:
            self.trump = None

        self.announcing = True

    async def announce(self, name, data):
        if not self.announcing or self.choosing_trump:
            raise Exception('You shouldn\'t be doing this…')
        if name != self._sorted_players()[self.current_player].name:
            print("%s, %s, %d" % (name, self._sorted_players(), self.current_player))
            raise Exception('It\'s not your turn, bitch')
        if data['announcement'] > self.round:
            raise Exception('U dumb af or what?!')
        next_player = (self.current_player + 1) % self._active_players()
        self.players[name].announcement = data['announcement']
        events = [Event(self.player_event, False, True)]
        if next_player == self.first_player:
            if self._sum() == self.round:
                raise Exception('Nope. Wrong number ¯\\_(ツ)_/¯')
            self.announcing = False
            events.append(Event(self.state_event, True, True))
        self.current_player = next_player
        for event in events:
            await self.room.fire_event('', event)

    # Helpers
    def _active_players(self):
        return len([player for player in self.players.values() if player.active])

    def _get_card(self, player, data):
        for card in player.hand:
            card_type = data['type']
            if card_type == card['type']:
                if card_type != TYPE_CARD or \
                        (card['color'] == data['color'] and card['number'] == data['number']):
                    return card
        return None

    def _get_first_card(self):
        for table_card in self.table:
            if table_card['type'] != TYPE_FOOL:
                return table_card
        return None

    def _is_card_allowed(self, card, player):
        if card['type'] != TYPE_CARD:
            return True
        first_card = self._get_first_card()
        if not first_card or first_card['type'] == TYPE_WIZARD:
            return True
        if card['color'] == first_card['color']:
            return True
        for hand_card in player.hand:
            if hand_card != card and hand_card['type'] == TYPE_CARD and \
                    hand_card['color'] == first_card['color']:
                return False
        return True


    def _sum(self):
        return sum([player.announcement for player in self.players.values()])

    def _get_trick_winner(self):
        first_card = self._get_first_card()
        if not first_card:
            return self.table[-1]['owner']
        best_card = first_card
        for card in self.table:
            if card['type'] == TYPE_WIZARD:
                return card['owner']
            if card['type'] == TYPE_CARD:
                if (card['color'] == best_card['color'] and card['number'] > best_card['number']) \
                        or (self.trump and 'color' in self.trump and \
                            card['color'] == self.trump['color'] and \
                            best_card['color'] != self.trump['color']):
                    best_card = card
        return best_card['owner']


    def _sorted_players(self):
        return sorted(self.players.values(), key=lambda p: p.name)

    def cts(self, color):
        colors = ['red', 'blue', 'green', 'yellow']
        return colors[color]

    def stc(self, color):
        colors = ['red', 'blue', 'green', 'yellow']
        return colors.index(color)

    def _cmp_cards(self, carda, cardb):
        if carda == cardb:
            return 0
        if carda['type'] == TYPE_WIZARD or cardb['type'] == TYPE_FOOL:
            return 1
        if carda['type'] == TYPE_FOOL or cardb['type'] == TYPE_WIZARD:
            return -1
        if carda['color'] == cardb['color']:
            return 1 if carda['number'] > cardb['number'] else -1
        if self.trump and carda['color'] == self.trump['color']:
            return 1
        return 1 if self.stc(carda['color']) > self.stc(cardb['color']) else -1

    def _cmp_to_key(self, mycmp):
        class K(object):
            def __init__(self, obj, *args):
                self.obj = obj
            def __lt__(self, other):
                return mycmp(self.obj, other.obj) < 0
            def __gt__(self, other):
                return mycmp(self.obj, other.obj) > 0
            def __eq__(self, other):
                return mycmp(self.obj, other.obj) == 0
            def __le__(self, other):
                return mycmp(self.obj, other.obj) <= 0
            def __ge__(self, other):
                return mycmp(self.obj, other.obj) >= 0
            def __ne__(self, other):
                return mycmp(self.obj, other.obj) != 0
        return K
