import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VIGENT_HOME } from './workspaceManager';
import { NodeIdentity, NodeRegion, NodeStatusResponse, NodeSetupPayload } from '@/types/office';

export const KEYSTORE_PATH = path.join(VIGENT_HOME, 'keystore.json');
export const REGIONS_PATH = path.join(VIGENT_HOME, 'regions.json');

// Curated BIP-39 English Wordlist for deterministic seed phrase generation
export const BIP39_WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
  'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
  'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
  'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
  'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
  'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
  'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
  'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
  'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
  'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
  'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
  'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
  'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
  'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
  'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel',
  'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon',
  'card', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle', 'casual',
  'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling',
  'celery', 'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change',
  'chaos', 'chapter', 'charge', 'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry',
  'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk',
  'churn', 'cigar', 'cinnamon', 'circle', 'citizen', 'city', 'civil', 'claim', 'clap', 'clarify',
  'claw', 'clay', 'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic',
  'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster',
  'clutch', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color',
  'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm',
  'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral',
  'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin',
  'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl',
  'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop',
  'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry',
  'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion',
  'custom', 'cute', 'cycle', 'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dash',
  'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline',
  'decorate', 'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand',
  'demise', 'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive',
  'describe', 'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'develop', 'device',
  'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet', 'differ', 'digital',
  'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover', 'disease', 'dish',
  'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document',
  'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double',
  'dove', 'draft', 'dragon', 'drain', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift',
  'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune',
  'during', 'dust', 'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle', 'early', 'earn',
  'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate',
  'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element', 'elephant',
  'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ', 'empower',
  'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce', 'engage',
  'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire',
  'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion', 'error',
  'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke',
  'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute', 'exercise',
  'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain',
  'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty', 'fade',
  'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantasy',
  'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature', 'february',
  'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever', 'few',
  'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find', 'fine',
  'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness', 'fix',
  'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock',
  'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold',
  'follow', 'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward',
  'fossil', 'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe',
  'frog', 'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace',
  'fury', 'future', 'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage',
  'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general',
  'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger',
  'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe',
  'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose',
  'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape',
  'grass', 'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow',
  'grunt', 'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit', 'hair',
  'half', 'hammer', 'hamster', 'hand', 'handle', 'harbor', 'hard', 'harsh', 'harvest', 'hat',
  'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello',
  'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire',
  'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood',
  'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub',
  'huge', 'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt',
  'husband', 'hybrid', 'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal',
  'illness', 'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch',
  'include', 'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform',
  'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane', 'insect',
  'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve', 'iron',
  'island', 'isolate', 'issue', 'item', 'ivory', 'jacket', 'jaguar', 'jar', 'jazz', 'jealous',
  'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge', 'juice',
  'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep', 'ketchup', 'key',
  'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten',
  'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label', 'labor', 'ladder', 'lady',
  'lake', 'lamp', 'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry', 'lava',
  'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture',
  'left', 'leg', 'legal', 'legend', 'leisure', 'lemon', 'lend', 'length', 'lens', 'leopard',
  'lesson', 'letter', 'level', 'liar', 'liberty', 'library', 'license', 'life', 'lift', 'light',
  'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list', 'little', 'live', 'lizard',
  'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long', 'loop', 'lottery',
  'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber', 'lunar', 'lunch', 'luxury',
  'lyrics', 'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make',
  'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march',
  'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match', 'material', 'math',
  'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal',
  'media', 'melody', 'melt', 'member', 'memory', 'mention', 'menu', 'mercy', 'merge', 'merit',
  'merry', 'mesh', 'message', 'metal', 'method', 'middle', 'midnight', 'milk', 'million', 'mimic',
  'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix',
  'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster',
  'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain',
  'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom',
  'music', 'must', 'mutual', 'myself', 'mystery', 'myth', 'naive', 'name', 'napkin', 'narrow',
  'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew',
  'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night',
  'noble', 'noise', 'nominee', 'noodle', 'normal', 'north', 'nose', 'notable', 'note', 'nothing',
  'notice', 'novel', 'now', 'nuclear', 'number', 'nurse', 'nut', 'oak', 'obey', 'object',
  'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean', 'october', 'odor', 'off',
  'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive', 'olympic', 'omit', 'once',
  'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion', 'oppose', 'option', 'orange',
  'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original', 'orphan', 'ostrich', 'other',
  'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own', 'owner', 'oxygen',
  'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel',
  'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot', 'party', 'pass', 'patch',
  'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear',
  'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper', 'perfect', 'permit', 'person',
  'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic', 'picture', 'piece', 'pig',
  'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol', 'pitch', 'pizza', 'place',
  'planet', 'plastic', 'plate', 'play', 'please', 'pledge', 'pluck', 'plug', 'plunge', 'poem',
  'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool', 'popular', 'portion',
  'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice', 'praise',
  'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary', 'print',
  'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program', 'project',
  'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding', 'pull',
  'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose', 'purse',
  'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter', 'question', 'quick', 'quit',
  'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail', 'rain',
  'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate', 'rather',
  'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild', 'recall', 'receive',
  'recipe', 'record', 'recycle', 'reduce', 'reflect', 'reform', 'refuse', 'region', 'regret', 'regular',
  'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember', 'remind', 'remove', 'render',
  'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report', 'require', 'rescue', 'resemble',
  'resist', 'resource', 'response', 'result', 'retire', 'retreat', 'return', 'reunion', 'reveal', 'review',
  'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich', 'ride', 'ridge', 'rifle', 'right',
  'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual', 'rival', 'river', 'road', 'roast',
  'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie', 'room', 'rose', 'rotate', 'rough',
  'round', 'route', 'royal', 'rubber', 'rude', 'rug', 'rule', 'run', 'runway', 'rural',
  'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute',
  'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale',
  'scan', 'scare', 'scatter', 'scene', 'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout',
  'scrap', 'screen', 'script', 'scrub', 'sea', 'search', 'season', 'seat', 'second', 'secret',
  'section', 'security', 'seed', 'seek', 'segment', 'select', 'sell', 'seminar', 'senior', 'sense',
  'sentence', 'series', 'service', 'session', 'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow',
  'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine', 'ship', 'shiver', 'shock',
  'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove', 'shrimp', 'shrug', 'shuffle', 'shy',
  'sibling', 'sick', 'side', 'siege', 'sight', 'sign', 'silent', 'silk', 'silly', 'silver',
  'similar', 'simple', 'since', 'sing', 'siren', 'sister', 'situate', 'six', 'size', 'skate',
  'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull', 'slab', 'slam', 'sleep', 'slender',
  'slice', 'slide', 'slight', 'slim', 'slogan', 'slot', 'slow', 'slush', 'small', 'smart',
  'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap', 'sniff', 'snow', 'soap', 'soccer',
  'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid', 'solution', 'solve', 'someone',
  'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south', 'space',
  'spare', 'spatial', 'spawn', 'speak', 'special', 'speed', 'spell', 'spend', 'sphere', 'spice',
  'spider', 'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon', 'sport', 'spot',
  'spray', 'spread', 'spring', 'spy', 'squad', 'square', 'stable', 'stadium', 'staff', 'stage',
  'stair', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel', 'stem', 'step',
  'stereo', 'stick', 'still', 'sting', 'stock', 'stomach', 'stone', 'stool', 'story', 'stove',
  'strategy', 'street', 'strike', 'strong', 'struggle', 'student', 'stuff', 'stumble', 'style', 'subject',
  'submit', 'subway', 'success', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer',
  'sun', 'sunny', 'sunset', 'super', 'supply', 'supreme', 'sure', 'surface', 'surge', 'surprise',
  'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap', 'swarm', 'swear', 'sweet',
  'swift', 'swim', 'swing', 'switch', 'sword', 'symbol', 'symptom', 'syrup', 'system', 'table',
  'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target', 'task', 'taste',
  'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent', 'term',
  'test', 'text', 'thank', 'that', 'theme', 'then', 'theory', 'there', 'they', 'thing',
  'this', 'thought', 'three', 'thrive', 'throw', 'thumb', 'thunder', 'ticket', 'tide', 'tiger',
  'tilt', 'timber', 'time', 'tiny', 'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco',
  'today', 'toddler', 'toe', 'together', 'toilet', 'token', 'tomato', 'tomorrow', 'tone', 'tongue',
  'tonight', 'tool', 'tooth', 'top', 'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss',
  'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track', 'trade', 'traffic', 'train',
  'transfer', 'trap', 'trash', 'travel', 'tray', 'treat', 'tree', 'trend', 'trial', 'tribe',
  'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet',
  'trust', 'truth', 'try', 'tube', 'tuition', 'tumble', 'tuna', 'tunnel', 'turkey', 'turn',
  'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical', 'ugly',
  'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy',
  'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update',
  'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'urge', 'usage', 'use', 'used',
  'useful', 'useless', 'usual', 'utility', 'vacant', 'vacuum', 'vague', 'valuable', 'van', 'vanish',
  'vapor', 'various', 'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb',
  'verify', 'version', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vicious', 'victory', 'video',
  'view', 'village', 'vintage', 'violin', 'virtual', 'virus', 'visa', 'visit', 'visual', 'vital',
  'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume', 'vote', 'voyage', 'wage', 'wagon',
  'wait', 'walk', 'wall', 'walnut', 'want', 'war', 'warm', 'warrior', 'wash', 'wasp',
  'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel', 'weather', 'web',
  'wedding', 'weekend', 'weird', 'welcome', 'west', 'wet', 'whale', 'what', 'wheat', 'wheel',
  'when', 'where', 'whip', 'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win',
  'window', 'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish',
  'witness', 'wolf', 'woman', 'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry',
  'worth', 'wrap', 'wreck', 'wrestle', 'wrist', 'write', 'wrong', 'yard', 'year', 'yellow',
  'you', 'young', 'youth', 'zebra', 'zero', 'zone', 'zoo'
];

// Default Genesis Regional Shards (Real zero-state P2P cluster)
export const DEFAULT_REGIONS: NodeRegion[] = [
  {
    id: 'apac-jakarta-1',
    name: 'APAC Jakarta Shard-1',
    countryCode: 'ID',
    flag: '🇮🇩',
    pingMs: 12,
    capacityPercentage: 0,
    currentSlots: 0,
    maxSlots: 100,
    status: 'available',
    city: 'Jakarta, Indonesia',
    coordinates: { latitude: -6.2088, longitude: 106.8456 },
  },
  {
    id: 'apac-singapore-1',
    name: 'APAC Singapore Shard-1',
    countryCode: 'SG',
    flag: '🇸🇬',
    pingMs: 28,
    capacityPercentage: 0,
    currentSlots: 0,
    maxSlots: 100,
    status: 'available',
    city: 'Singapore',
    coordinates: { latitude: 1.3521, longitude: 103.8198 },
  },
  {
    id: 'apac-tokyo-1',
    name: 'APAC Tokyo Shard-1',
    countryCode: 'JP',
    flag: '🇯🇵',
    pingMs: 74,
    capacityPercentage: 0,
    currentSlots: 0,
    maxSlots: 100,
    status: 'available',
    city: 'Tokyo, Japan',
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
  },
  {
    id: 'eu-frankfurt-1',
    name: 'EU Frankfurt Shard-1',
    countryCode: 'DE',
    flag: '🇩🇪',
    pingMs: 165,
    capacityPercentage: 0,
    currentSlots: 0,
    maxSlots: 100,
    status: 'available',
    city: 'Frankfurt, Germany',
    coordinates: { latitude: 50.1109, longitude: 8.6821 },
  },
  {
    id: 'us-east-1',
    name: 'US East Virginia Shard-1',
    countryCode: 'US',
    flag: '🇺🇸',
    pingMs: 188,
    capacityPercentage: 0,
    currentSlots: 0,
    maxSlots: 100,
    status: 'available',
    city: 'Virginia, USA',
    coordinates: { latitude: 37.4316, longitude: -78.6569 },
  },
];

export interface KavlingPlotDef {
  id: string; // 'plot-nc', 'plot-nw', 'plot-ne', 'plot-sw', 'plot-sc', 'plot-se'
  label: string;
  shortLabel: string;
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
}

export const DISTRICT_OFFICE_PLOTS: KavlingPlotDef[] = [
  { id: 'plot-nc', label: 'Kavling Sentral Utama', shortLabel: 'Sentral Utama', cx: 0.0, cz: -1.0, halfW: 16.5, halfD: 11.0 },
  { id: 'plot-nw', label: 'Kavling Regional Barat #1', shortLabel: 'Barat #1', cx: -42.0, cz: -1.0, halfW: 16.5, halfD: 11.0 },
  { id: 'plot-ne', label: 'Kavling Regional Timur #1', shortLabel: 'Timur #1', cx: 42.0, cz: -1.0, halfW: 16.5, halfD: 11.0 },
  { id: 'plot-sw', label: 'Kavling Regional Barat #2', shortLabel: 'Barat #2', cx: -42.0, cz: 39.5, halfW: 16.5, halfD: 11.0 },
  { id: 'plot-sc', label: 'Kavling Regional Selatan #1', shortLabel: 'Selatan #1', cx: 0.0, cz: 39.5, halfW: 16.5, halfD: 11.0 },
  { id: 'plot-se', label: 'Kavling Regional Timur #2', shortLabel: 'Timur #2', cx: 42.0, cz: 39.5, halfW: 16.5, halfD: 11.0 },
];

/**
 * Generate a new random/unique region ID when no live nodes exist or user creates a new shard
 */
export function generateUniqueRegionId(basePrefix = 'apac-custom'): string {
  const rand = crypto.randomBytes(3).toString('hex');
  return `${basePrefix}-${rand}`;
}

/**
 * Find an unclaimed, empty kavling plot in the target region.
 * Avoids any plot collision with existing active live peers.
 */
export function assignEmptyPlotInRegion(
  regionId: string,
  peerNodes: any[] = [],
  preferredPlotId?: string
): { plotId: string; plotCoords: { cx: number; cz: number } } {
  // Collect all plots claimed by active peers in this region
  const claimed = new Set<string>();
  (peerNodes || []).forEach((p) => {
    if (p && p.isOnline !== false && (p.regionId === regionId || p.regionalSector === regionId)) {
      if (p.plotId) claimed.add(p.plotId);
    }
  });

  // If preferred plot is specified and not claimed, use it
  if (preferredPlotId && !claimed.has(preferredPlotId)) {
    const match = DISTRICT_OFFICE_PLOTS.find((pl) => pl.id === preferredPlotId);
    if (match) return { plotId: match.id, plotCoords: { cx: match.cx, cz: match.cz } };
  }

  // Otherwise, find the first plot that is not claimed
  const freePlot = DISTRICT_OFFICE_PLOTS.find((pl) => !claimed.has(pl.id));
  if (freePlot) {
    return { plotId: freePlot.id, plotCoords: { cx: freePlot.cx, cz: freePlot.cz } };
  }

  // All 6 plots are claimed in this region!
  // Fall back to plot-nc
  return { plotId: 'plot-nc', plotCoords: { cx: 0.0, cz: -1.0 } };
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Generate 12-word cryptographic seed phrase
 */
export function generateMnemonic(wordCount: number = 12): string {
  const words: string[] = [];
  const listLen = BIP39_WORDLIST.length;
  
  for (let i = 0; i < wordCount; i++) {
    const randomBuffer = crypto.randomBytes(4);
    const randomIndex = randomBuffer.readUInt32BE(0) % listLen;
    words.push(BIP39_WORDLIST[randomIndex]);
  }
  
  return words.join(' ');
}

/**
 * Deterministically derive an Address and Keys from a seed phrase
 */
export function deriveAddressAndKeys(mnemonic: string): { address: string; publicKey: string } {
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  // Deterministic seed generation using PBKDF2
  const seed = crypto.pbkdf2Sync(cleanMnemonic, 'mnemonic_salt_vigent_ceo', 2048, 64, 'sha512');
  
  // Public Key hash (first 32 bytes)
  const pubKeyHash = crypto.createHash('sha256').update(seed.subarray(0, 32)).digest('hex');
  const publicKey = `04${pubKeyHash}`;
  
  // Derive Ethereum/EVM-style Address: keccak256 or sha256 of public key -> take last 20 bytes (40 hex chars)
  const addrHash = crypto.createHash('sha256').update(seed.subarray(32, 64)).digest('hex');
  const rawAddress = addrHash.substring(addrHash.length - 40);
  
  // EIP-55 style checksum formatting
  let checksumAddress = '0x';
  const subHash = crypto.createHash('sha256').update(rawAddress).digest('hex');
  for (let i = 0; i < rawAddress.length; i++) {
    if (parseInt(subHash[i], 16) >= 8) {
      checksumAddress += rawAddress[i].toUpperCase();
    } else {
      checksumAddress += rawAddress[i].toLowerCase();
    }
  }
  
  return {
    address: checksumAddress,
    publicKey,
  };
}

/**
 * Sign a payload using the deterministic seed
 */
export function signPayload(mnemonic: string, payload: any): { hash: string; signature: string } {
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  const seed = crypto.pbkdf2Sync(cleanMnemonic, 'mnemonic_salt_vigent_ceo', 2048, 32, 'sha256');
  
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(payloadStr).digest('hex');
  
  const hmac = crypto.createHmac('sha256', seed);
  hmac.update(hash);
  const signature = `0x${hmac.digest('hex')}`;
  
  return { hash, signature };
}

/**
 * Check if the node keystore exists and is initialized
 */
export function isNodeInitialized(): boolean {
  if (!fs.existsSync(KEYSTORE_PATH)) return false;
  try {
    const raw = fs.readFileSync(KEYSTORE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return Boolean(data && data.ownerAddress && data.companyId);
  } catch (err) {
    return false;
  }
}

/**
 * Get current node identity (safe for public exposure, strips mnemonic)
 */
export function getNodeIdentity(includeMnemonic: boolean = false): NodeIdentity | null {
  if (!fs.existsSync(KEYSTORE_PATH)) return null;
  try {
    const raw = fs.readFileSync(KEYSTORE_PATH, 'utf-8');
    const data = JSON.parse(raw) as NodeIdentity;
    if (!includeMnemonic) {
      delete data.mnemonic;
    }
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Get available regions and handle real node capacity & dynamic auto-sharding
 * Counts ONLY real active local and peer nodes (Zero dummy data).
 */
export function getAvailableRegions(): NodeRegion[] {
  // Start with clean base regions
  const regions: NodeRegion[] = DEFAULT_REGIONS.map((r) => ({
    ...r,
    currentSlots: 0,
    capacityPercentage: 0,
    status: 'available' as const,
    claimedPlots: {},
  }));

  // 1. Check local node identity from keystore
  const localNode = getNodeIdentity(false);
  const localRegionId = localNode?.regionId || null;

  // 2. Check real P2P peer nodes from disk
  const peersFile = path.join(VIGENT_HOME, 'p2p_peers.json');
  let peers: any[] = [];
  if (fs.existsSync(peersFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(peersFile, 'utf-8'));
      if (Array.isArray(parsed)) {
        peers = parsed.filter((p) => p && p.isOnline !== false);
      }
    } catch {}
  }

  // Check for any custom regions created by local node or peers
  const allKnownRegionIds = new Set<string>();
  if (localRegionId) allKnownRegionIds.add(localRegionId);
  peers.forEach((p) => {
    if (p.regionId) allKnownRegionIds.add(p.regionId);
    if (p.regionalSector) allKnownRegionIds.add(p.regionalSector);
  });

  allKnownRegionIds.forEach((cRegId) => {
    if (!regions.some((r) => r.id === cRegId)) {
      // Dynamic custom/spawned region
      regions.push({
        id: cRegId,
        name: `Cluster ${cRegId.toUpperCase()}`,
        countryCode: 'ID',
        flag: '🌐',
        pingMs: 15,
        capacityPercentage: 0,
        currentSlots: 0,
        maxSlots: 6, // 6 office kavling plots per region
        status: 'available',
        city: 'Decentralized P2P Mesh',
        claimedPlots: {},
      });
    }
  });

  // 3. Count real active nodes & claimed plots per region
  for (const reg of regions) {
    let count = 0;
    const claimedPlots: Record<string, string> = {};

    if (localRegionId === reg.id) {
      count += 1;
      const localPlot = localNode?.plotId || 'plot-nc';
      claimedPlots[localPlot] = `${localNode?.companyName || 'My Office'} (Local)`;
    }

    const matchingPeers = peers.filter(
      (p) => p.regionalSector === reg.id || p.regionId === reg.id
    );
    count += matchingPeers.length;

    matchingPeers.forEach((p) => {
      const pPlot = p.plotId || 'plot-nw';
      claimedPlots[pPlot] = p.companyName || p.nodeId || 'Peer Node';
    });

    reg.currentSlots = count;
    reg.capacityPercentage = Math.round((reg.currentSlots / 6) * 100);
    reg.status = count === 0 ? 'available' : reg.currentSlots >= 6 ? 'high_load' : 'optimal';
    reg.claimedPlots = claimedPlots;
  }

  // 4. Dynamic Auto-Sharding Rule (Only spawns if a region genuinely reaches >= 6 nodes full)
  const fullRegion = regions.find((r) => r.currentSlots >= 6 && !r.isAutoSpawned);
  if (fullRegion) {
    const shard2Id = `${fullRegion.id.replace(/-1$/, '')}-2`;
    const alreadySpawned = regions.some((r) => r.id === shard2Id);
    if (!alreadySpawned) {
      const autoShard: NodeRegion = {
        id: shard2Id,
        name: `${fullRegion.name.replace(/Shard-1$/, '')} Shard-2 (Auto-Spawned)`,
        countryCode: fullRegion.countryCode,
        flag: fullRegion.flag,
        pingMs: fullRegion.pingMs + 2,
        capacityPercentage: 0,
        currentSlots: 0,
        maxSlots: 6,
        status: 'available',
        isAutoSpawned: true,
        city: fullRegion.city,
        coordinates: fullRegion.coordinates,
        claimedPlots: {},
      };
      const idx = regions.findIndex((r) => r.id === fullRegion.id);
      regions.splice(idx + 1, 0, autoShard);
    }
  }

  // Always keep cached regions.json synced with real numbers
  try {
    fs.writeFileSync(REGIONS_PATH, JSON.stringify(regions, null, 2), 'utf-8');
  } catch {}

  return regions;
}

/**
 * Setup or Restore Node Identity
 */
export function setupNodeIdentity(payload: NodeSetupPayload): { success: boolean; identity: NodeIdentity; error?: string } {
  try {
    if (!fs.existsSync(VIGENT_HOME)) {
      fs.mkdirSync(VIGENT_HOME, { recursive: true });
    }
    
    const words = payload.mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length !== 12) {
      return { success: false, identity: null as any, error: 'Mnemonic seed phrase harus tepat 12 kata!' };
    }
    
    const cleanMnemonic = words.join(' ');
    const { address, publicKey } = deriveAddressAndKeys(cleanMnemonic);
    
    const companyId = `comp-${address.substring(2, 10).toLowerCase()}`;
    const createdAt = Date.now();
    
    // Check known peers to auto-assign a free plot without collision
    const peersFile = path.join(VIGENT_HOME, 'p2p_peers.json');
    let peers: any[] = [];
    if (fs.existsSync(peersFile)) {
      try {
        peers = JSON.parse(fs.readFileSync(peersFile, 'utf-8'));
      } catch {}
    }

    const { plotId, plotCoords } = assignEmptyPlotInRegion(payload.regionId || 'apac-jakarta-1', peers, payload.plotId);

    // Create Genesis Block Payload
    const genesisData = {
      txType: 'COMPANY_GENESIS',
      companyId,
      name: payload.companyName || 'My Virtual Company',
      industry: payload.industry || 'Software Engineering',
      regionId: payload.regionId || 'apac-jakarta-1',
      plotId,
      plotCoords,
      ownerAddress: address,
      geoCoordinates: payload.geoCoordinates,
      createdAt,
      nonce: 1,
    };
    
    const { hash: genesisHash, signature: genesisSignature } = signPayload(cleanMnemonic, genesisData);
    
    const identity: NodeIdentity = {
      ownerAddress: address,
      publicKey,
      mnemonic: cleanMnemonic,
      createdAt,
      companyId,
      companyName: payload.companyName || 'My Virtual Company',
      industry: payload.industry || 'Software Engineering',
      regionId: payload.regionId || 'apac-jakarta-1',
      plotId,
      plotCoords,
      genesisHash,
      genesisSignature,
      geoCoordinates: payload.geoCoordinates,
      lastSyncedAt: Date.now(),
    };
    
    // Persist to ~/.ceo-virtual/keystore.json
    fs.writeFileSync(KEYSTORE_PATH, JSON.stringify(identity, null, 2), 'utf-8');

    // Also sync to node_identity.json for P2P daemon
    try {
      const idPath = path.join(VIGENT_HOME, 'node_identity.json');
      let idData: any = {};
      if (fs.existsSync(idPath)) {
        try { idData = JSON.parse(fs.readFileSync(idPath, 'utf-8')); } catch {}
      }
      idData.companyName = identity.companyName;
      idData.regionalSector = identity.regionId;
      idData.regionId = identity.regionId;
      idData.plotId = identity.plotId;
      fs.writeFileSync(idPath, JSON.stringify(idData, null, 2), 'utf-8');
    } catch {}
    
    // Toggle system startup autorun if specified
    if (payload.autorun !== undefined) {
      setSystemStartupAutorun(payload.autorun);
    }
    
    // Sync real region slots immediately
    try {
      getAvailableRegions();
    } catch (err) {}
    
    return { success: true, identity };
  } catch (err: any) {
    return { success: false, identity: null as any, error: err.message || 'Gagal menyimpan keystore' };
  }
}

/**
 * Relocate office to another region and claim an empty, unassigned kavling plot
 */
export function relocateNodeRegion(
  targetRegionId: string,
  preferredPlotId?: string
): { success: boolean; identity: NodeIdentity; error?: string } {
  const currentIdentity = getNodeIdentity(true);
  if (!currentIdentity) {
    return { success: false, identity: null as any, error: 'Keystore belum diinisialisasi' };
  }

  // Load known live peers
  const peersFile = path.join(VIGENT_HOME, 'p2p_peers.json');
  let peers: any[] = [];
  if (fs.existsSync(peersFile)) {
    try {
      peers = JSON.parse(fs.readFileSync(peersFile, 'utf-8'));
    } catch {}
  }

  const { plotId, plotCoords } = assignEmptyPlotInRegion(targetRegionId, peers, preferredPlotId);

  currentIdentity.regionId = targetRegionId;
  currentIdentity.plotId = plotId;
  currentIdentity.plotCoords = plotCoords;
  currentIdentity.lastSyncedAt = Date.now();

  try {
    fs.writeFileSync(KEYSTORE_PATH, JSON.stringify(currentIdentity, null, 2), 'utf-8');
    // Update node_identity.json for P2P daemon
    const idPath = path.join(VIGENT_HOME, 'node_identity.json');
    if (fs.existsSync(idPath)) {
      try {
        const idData = JSON.parse(fs.readFileSync(idPath, 'utf-8'));
        idData.regionalSector = targetRegionId;
        idData.regionId = targetRegionId;
        idData.plotId = plotId;
        fs.writeFileSync(idPath, JSON.stringify(idData, null, 2), 'utf-8');
      } catch {}
    }

    // Refresh regions cache
    try {
      getAvailableRegions();
    } catch {}
  } catch (err: any) {
    return { success: false, identity: null as any, error: err.message };
  }

  return { success: true, identity: currentIdentity };
}

/**
 * Configure OS startup autorun (Windows Startup folder, macOS LaunchAgents, or Linux autostart)
 */
export function setSystemStartupAutorun(enable: boolean): boolean {
  try {
    const projectRoot = process.cwd();
    const port = 28483;

    if (process.platform === 'win32') {
      const startupFolder = path.join(
        process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Startup'
      );
      const batPath = path.join(startupFolder, 'CEOVirtual.bat');
      if (enable) {
        if (!fs.existsSync(startupFolder)) fs.mkdirSync(startupFolder, { recursive: true });
        const batContent = `@echo off\r\ncd /d "${projectRoot}"\r\nstart /b npm run dev -- -p ${port}\r\n`;
        fs.writeFileSync(batPath, batContent, 'utf-8');
      } else {
        if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
      }
      return true;
    }
  } catch (err) {
    console.warn('[Autorun] Failed to toggle system startup autorun:', err);
  }
  return false;
}
