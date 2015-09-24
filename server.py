import gensim
import cherrypy
import jinja2
import json
from miningTools import stemSentence
import os

appDir = os.path.abspath(os.path.dirname(__file__))

templateLoader = jinja2.FileSystemLoader(searchpath = "html")
templateEnv = jinja2.Environment(loader = templateLoader)

f = open('/home/bbales2/scraping/webpage/db/sentences.json', 'r')
sentenceStrings = json.loads(f.read())
f.close()

index = gensim.similarities.docsim.MatrixSimilarity.load('/home/bbales2/scraping/webpage/db/index')
dictionary = gensim.corpora.dictionary.Dictionary.load('/home/bbales2/scraping/webpage/db/dictionary')
tfidf = gensim.models.tfidfmodel.TfidfModel.load('/home/bbales2/scraping/webpage/db/tfidf')
lsa = gensim.models.lsimodel.LsiModel.load('/home/bbales2/scraping/webpage/db/lsa')

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
    def getResults(self, query):

        return {
            'molns': 0,
        }

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
