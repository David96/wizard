# pylint: disable=C0116,W0201

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

    def __init__(self, room):
        self.ACTIONS = {
            'play_card': self.play_card,
            'announce': self.announce,
        }
        self.players = {}
        self.room = room
        self.reset()

    def reset(self):
        for player in list(self.players.values()):
            player.score = 0
        self.stack = []
        self.trump = None
        self.choosing_trump = None
        self.announcing = False
        self.table = []
        self.round = 0
        self.current_player = -1
        self.first_player = 0
        self.game_over = False
        self.winners = []
        self.state_dirty = self.players_dirty = False
        self.colors = ['red', 'blue', 'green', 'yellow']
        if len(self.players) > 6:
            self.colors.append('orange')

    async def send_dirty(self):
        if self.state_dirty:
            await self.room.fire_event('', Event(self.state_event, True, True))
        if self.players_dirty:
            await self.room.fire_event('', Event(self.player_event, False, True))
        self.state_dirty = self.players_dirty = False

    async def add_player(self, name):
        if not self.room.started or self.game_over:
            self.players[name] = Player(name)
            if len(self.players) == 7:
                self.colors.append('orange')
        else:
            return False
        self.players_dirty = True
        return True

    def remove_player(self, name):
        player = self.players[name]
        if self.room.started and not self.game_over:
            # While the game is running, keep kicked players around as ghosts:
            # cards they played stay owned by them and their score can still be
            # shown at the end. They never act or receive cards again.
            if player.active:
                removed_idx = self._sorted_active_players().index(player)
                player.active = False
                player.hand = []
                actives = self._sorted_active_players()
                if self.choosing_trump == name and actives:
                    self.choosing_trump = actives[removed_idx % len(actives)].name
                self._fixup_indices(removed_idx)
        else:
            del self.players[name]
        self.players_dirty = True

    # Events
    def state_event(self, name):
        player = self.players[name]
        table = self.table if self.round > 1 or not self.announcing \
                           else [player.hand[0] for player in self._sorted_active_players()
                                   if player.name != name]
        return json.dumps({
            'type': 'state',
            'table': table,
            'hand': player.hand if self.round > 1 else [],
            'round': self.round,
            'trump': self.trump,
            'announcing': self.announcing and not self.choosing_trump,
            'choosing_trump': self.choosing_trump,
            'game_over': self.game_over,
            'winners': [winner.name for winner in self.winners],
        })

    def player_event(self, _):
        actives = self._sorted_active_players()
        return json.dumps({
            'type': 'player',
            'players': [{
                'name': player.name,
                'active': player.active,
                'announcement': player.announcement,
                'score': player.score,
                'tricks': player.tricks,
                'turn': self.current_player > -1 and
                                self.current_player < len(actives) and
                                player == actives[self.current_player]
            } for player in self._sorted_players()]
        })

    # Actions
    def start_game(self):
        # Ghosts of previous games don't get a second life
        self.players = {name: p for name, p in self.players.items() if p.active}
        self.reset()
        self.new_round()
        self.players_dirty = self.state_dirty = True

    def choose_trump(self, name, data):
        if name != self.choosing_trump:
            raise Exception('You dumb motherfucker are not supposed to choose the trump color!')
        self.trump['color'] = data['color']
        self.choosing_trump = None
        for player in self.players.values():
            player.hand = self._sort_cards(player.hand)
        del self.ACTIONS['choose_trump']
        self.players_dirty = self.state_dirty = True

    def play_card(self, name, data):
        if self.announcing or self.choosing_trump:
            raise Exception('God damn it, you aren\'t allowed to play a card right now!')
        if self.current_player < 0 or name != self._sorted_active_players()[self.current_player].name:
            raise Exception('It\'s not your turn, bitch')
        player = self.players[name]
        card = self._get_card(player, data)
        if not card:
            raise Exception('Damn, you don\'t even have that card.')
        if not self._is_card_allowed(card, player):
            raise Exception('Sadly, you are not allowed to play this card. Idiot.')
        player.hand.remove(card)
        self.table.append(card)
        self.current_player = (self.current_player + 1) % len(self._sorted_active_players())

        if self.current_player == self.first_player:
            self.finish_trick()
            self.room.call_later(3.0, self.new_trick)
        self.players_dirty = self.state_dirty = True

    def finish_trick(self):
        winner = self._get_trick_winner()
        self.players[winner].tricks += 1
        self.room.send_message('%s wins the trick.' % winner)
        self.current_player = -1
        # The round ends once all *active* players are out of cards
        if all(not player.hand for player in self._sorted_active_players()):
            self.finish_round()
        self.players_dirty = self.state_dirty = True

    def new_trick(self):
        winner = self._get_trick_winner()
        actives = self._sorted_active_players()
        if not actives:
            return
        if self.players[winner].active:
            self.current_player = actives.index(self.players[winner])
        else:
            # A ghost won the trick: the player after him in rotation
            # order opens the next trick instead
            players = self._sorted_players()
            idx = players.index(self.players[winner])
            next_player = next(p for p in players[idx + 1:] + players[:idx + 1]
                              if p.active)
            self.current_player = actives.index(next_player)
        self.first_player = self.current_player
        self.table.clear()
        if all(not player.hand for player in actives):
            self.new_round()
        self.state_dirty = self.players_dirty = True

    def finish_round(self):
        for player in self.players.values():
            # Ghosts that never announced count as having announced 0 tricks
            announcement = player.announcement if player.announcement > -1 else 0
            diff = abs(announcement - player.tricks)
            if diff == 0:
                score = 20 + player.tricks * 10
            else:
                score = -(diff * 10)
            player.score += score
            self.room.send_message('%s makes %d points.' % (player.name, score))

    def new_round(self):
        actives = self._sorted_active_players()
        if not actives:
            return
        self.round += 1
        self.table.clear()
        self.current_player = (self.round - 1) % len(actives)
        self.first_player = self.current_player

        # Create stack of all cards
        self.stack.clear()
        _id = 0
        for color in range(len(self.colors)):
            for i in range(1, 14):
                self.stack.append({
                    'type': TYPE_CARD,
                    'color': self.cts(color),
                    'number': i,
                    'id': _id
                })
                _id += 1
            self.stack.append({'type': TYPE_WIZARD, 'id': _id})
            _id += 1
            self.stack.append({'type': TYPE_FOOL, 'id': _id})
            _id += 1

        # if the game is over, figure out the winner(s)
        if self.round * len(actives) > len(self.stack):
            self.game_over = True
            players = self._sorted_players()
            best_players = [players[0]]
            for player in players[1:]:
                if player.score == best_players[0].score:
                    best_players.append(player)
                elif player.score > best_players[0].score:
                    best_players = [player]
            self.winners = best_players
            return

        # Choose a trump card
        self.trump = None
        if self.round * len(self.players) < len(self.stack):
            trump_card = random.sample(self.stack, 1)[0]
            self.stack.remove(trump_card)
            if trump_card['type'] == TYPE_WIZARD:
                prev_player = (self.current_player - 1) % len(actives)
                self.choosing_trump = self._sorted_active_players()[prev_player].name
                self.ACTIONS['choose_trump'] = self.choose_trump
            self.trump = trump_card

        # Hand out cards to players (ghosts don't get any)
        for player in actives:
            player.announcement = -1
            player.tricks = 0
            sample = random.sample(self.stack, self.round)
            for card in sample:
                card['owner'] = player.name
                self.stack.remove(card)
            player.hand = self._sort_cards(sample)

        self.announcing = True

    def announce(self, name, data):
        if not self.announcing or self.choosing_trump:
            raise Exception('You shouldn\'t be doing this…')
        if name != self._sorted_active_players()[self.current_player].name:
            raise Exception('It\'s not your turn, bitch')
        if not isinstance(data['announcement'], int):
            raise Exception('Maybe try an actual number?')
        if data['announcement'] > self.round:
            raise Exception('U dumb af or what?!')
        next_player = (self.current_player + 1) % len(self._sorted_active_players())
        self.players[name].announcement = data['announcement']
        self.players_dirty = True
        if next_player == self.first_player:
            if self._sum() == self.round:
                raise Exception('Nope. Wrong number ¯\\_(ツ)_/¯')
            self.announcing = False
            self.state_dirty = True
            self.room.send_message('%d of %d tricks announced.' % (self._sum(), self.round))
            # In round one, basically the whole trick has to be simulated,
            # as noone can actually play a card
            if self.round == 1:
                # Based on the assumption, that in the first round, the first player is also
                # the first entry in sorted_players, otherwise the order is wrong
                self.table = [player.hand.pop() for player in self._sorted_active_players()]
                self.finish_trick()
                self.room.call_later(3.0, self.new_trick)
                return
        self.current_player = next_player

    # Helpers
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
        return sum([player.announcement for player in self._sorted_active_players()])

    def _get_trick_winner(self):
        first_card = self._get_first_card()
        if not first_card:
            return self.table[0]['owner']
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
        return sorted(self.players.values(), key=lambda p: p.name.lower())

    def _sorted_active_players(self):
        return [player for player in self._sorted_players() if player.active]

    def _fixup_indices(self, removed_idx):
        # The removed player is gone from _sorted_active_players, so all
        # indices after him shift by one.
        actives = self._sorted_active_players()
        if not actives:
            self.current_player = -1
            return
        if removed_idx == self.current_player:
            # It was his turn: the same index now points to the next player
            self.current_player %= len(actives)
        elif removed_idx < self.current_player:
            # He already played/announced: shift the turn index left
            self.current_player -= 1
        if removed_idx < self.first_player:
            self.first_player -= 1

    def cts(self, color):
        return self.colors[color]

    def stc(self, color):
        return self.colors.index(color)

    def _get_cards_of_type(self, cards, t):
        return [card for card in cards if card['type'] == t]

    def _get_cards_of_color(self, cards, c):
        return [card for card in cards if 'color' in card and card['color'] == c]

    def _sort_cards(self, cards):
        fools = self._get_cards_of_type(cards, TYPE_FOOL)
        colors = [
            sorted(self._get_cards_of_color(cards, color), key=lambda c: c['number']) \
                for color in self.colors
        ]
        wizards = self._get_cards_of_type(cards, TYPE_WIZARD)
        sorted_cards = fools
        for i, c in enumerate(colors):
            if not (self.trump and 'color' in self.trump and self.cts(i) == self.trump['color']):
                sorted_cards += c
        if self.trump and 'color' in self.trump:
            sorted_cards += colors[self.stc(self.trump['color'])]
        sorted_cards += wizards
        return sorted_cards
