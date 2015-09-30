import gensim
import cherrypy
import jinja2
import json
from miningTools import stemSentence
import numpy
import traceback
import os
import stemming.porter2
import mldb
import sqlalchemy.orm

appDir = os.path.abspath(os.path.dirname(__file__))

templateLoader = jinja2.FileSystemLoader(searchpath = "html")
templateEnv = jinja2.Environment(loader = templateLoader)

#f = open('/home/bbales2/scraping/webpage/db/sentences.json', 'r')
#sentences = json.loads(f.read())
#f.close()

session, engine = mldb.getSession()

with open('/home/bbales2/scraping/webpage/db/index2id.big') as f:
    index2id = json.load(f)
#list(session.query(mldb.Sentence).options(sqlalchemy.orm.load_only("id")).order_by(mldb.Sentence.id).with_entities(mldb.Sentence.id))

index = gensim.similarities.docsim.MatrixSimilarity.load('/home/bbales2/scraping/webpage/db/index.big')
dictionary = gensim.corpora.dictionary.Dictionary.load('/home/bbales2/scraping/webpage/db/dictionary.big')
tfidf = gensim.models.tfidfmodel.TfidfModel.load('/home/bbales2/scraping/webpage/db/tfidf.big')
lsi = gensim.models.lsimodel.LsiModel.load('/home/bbales2/scraping/webpage/db/lsi.big')
word2vec = gensim.models.word2vec.Word2Vec.load('/home/bbales2/scraping/webpage/db/word2vec.big')
#doc2vec = gensim.models.word2vec.Word2Vec.load('/home/bbales2/scraping/webpage/db/doc2vec.big')

def logexceptions(func):
    def inner(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            traceback.print_exc()

            return { 'status' : False, 'msg' : str(e) }

    return inner

class App(object):
    @cherrypy.expose
    @logexceptions
    def index(self):
        template = templateEnv.get_template( 'index.html' )

        data = {}

        return template.render()

    @cherrypy.expose
    @cherrypy.tools.json_out()
    @logexceptions
    def getRankings(self, token, positiveWords, negativeWords):
        #stemSentence('lattice mismatch')
        results = None

        positiveWords = [stemming.porter2.stem(word) for word in json.loads(positiveWords)]
        negativeWords = [stemming.porter2.stem(word) for word in json.loads(negativeWords)]

        radius = 1

        #for state in states:
        result = index[lsi[tfidf[[dictionary.doc2bow(positiveWords)]]]].flatten()# * (1.0 - index[lsi[tfidf[[dictionary.doc2bow(negativeWords)]]]].flatten())

        rankings = { 'lsi' : [],
                     'doc2vec' : []}

        cs = numpy.concatenate((numpy.zeros(radius + 1), numpy.cumsum(result), numpy.zeros(radius)))

        integrated = numpy.zeros(len(result))
        for i in range(len(result)):
            integrated[i] = cs[i + 2 * radius + 1] - cs[i]

        for i in numpy.argsort(-integrated)[0:10]:
            #print i, len(index2id), len(result)
            rankings['lsi'].append((index2id[i][0], 0.0))
#result[i]
        #positiveVec = doc2vec.infer_vector(positiveWords)
        #negativeVec = doc2vec.infer_vector(negativeWords)

        #rankings['doc2vec'] = []
        #for idx, score in doc2vec.docvecs.most_similar(positive = [positiveVec], negative = [negativeVec], topn = 10):
        #    rankings['doc2vec'].append((idx, 0.0))

        sentenceIdxs = set([idx for idx, score in rankings['lsi']])# | set([idx for idx, score in rankings['doc2vec']])

        session, engine = mldb.getSession()

        sentences = {}
        for idx in sentenceIdxs:
            sentencem = session.query(mldb.Sentence).get(index2id[idx - 1])
            sentence = session.query(mldb.Sentence).get(index2id[idx])
            sentencep = session.query(mldb.Sentence).get(index2id[idx + 1])
            sentences[idx] = {
                'string' : sentencem.pattern.string + sentence.pattern.string + sentencep.pattern.string,
                'paper' : {
                    'title' : sentence.paper.data['dc:title'],
                    'url' : 'http://www.sciencedirect.com/science/article/pii/{0}'.format(sentence.paper.pii)
                }
            }

        return {
            'token' : token,
            'sentences': sentences,
            'rankings' : rankings
        }

    @cherrypy.expose
    @cherrypy.tools.json_out()
    @logexceptions
    def getSuggestions(self, token, positiveWords, negativeWords):
        positiveWords = [stemming.porter2.stem(word) for word in json.loads(positiveWords)]
        negativeWords = [stemming.porter2.stem(word) for word in json.loads(negativeWords)]

        suggested, weights = zip(*word2vec.most_similar(positive = positiveWords, negative = negativeWords, topn = 20))

        return { 'token' : token,
                 'suggested' : suggested,
                 'weights' : weights }

if __name__ == '__main__':
    cherrypy.quickstart(App(), '/', {
        '/' : {
            'tools.gzip.on' : True,
            'log.screen' : True,
            'tools.sessions.on' : True
        },
        '/js' : {
            'tools.staticdir.on' : True,
            'tools.staticdir.dir' : os.path.join(appDir, 'js'),
            'log.screen' : True
        },
        '/css' : {
            'tools.staticdir.on' : True,
            'tools.staticdir.dir' : os.path.join(appDir, 'css'),
            'log.screen' : True
        },
    })
