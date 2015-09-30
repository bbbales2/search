var Words = Words || {}

Words.WordGroup = Backbone.View.extend(
    {
        addPositiveWord : function(word)
        {
            if(word in this.positiveSelectors)
                return;

            this.positiveSelectors[word] = $( this.wordTemplate({ word : word } ) )
                .appendTo( this.$el.find('.positiveWords') );

            this.positiveSelectors[word]
                .find("button")
                .click(_.bind(_.partial(this.removeWord, word), this));

            this.buildNewSuggestions();
        },

        addNegativeWord : function(word)
        {
            if(word in this.negativeSelectors)
                return;

            this.negativeSelectors[word] = $( this.wordTemplate({ word : word } ) )
                .appendTo( this.$el.find('.negativeWords') );

            this.negativeSelectors[word]
                .find("button")
                .click(_.bind(_.partial(this.removeWord, word), this));

            this.buildNewSuggestions();
        },

        removeWord : function(word, e)
        {
            if(word in this.positiveSelectors)
            {
                this.positiveSelectors[word].remove();
                delete this.positiveSelectors[word];
            }

            if(word in this.negativeSelectors)
            {
                this.negativeSelectors[word].remove();
                delete this.negativeSelectors[word];
            }

            //if((_.keys(this.positiveSelectors).length + _.keys(this.negativeSelectors).length) == 0)
            //    this.remove();
            //else
            this.buildNewSuggestions();
        },

        buildNewSuggestions : function(words)
        {
            if(typeof(this.token) == "undefined")
                this.token = 0;

            var positiveWords = _.keys(this.positiveSelectors).map( function(word) { return stemmer(word); } );
            var negativeWords = _.keys(this.negativeSelectors).map( function(word) { return stemmer(word); } );

            this.token = this.token + 1;

            $.ajax({
                type : 'POST',
                url : 'getSuggestions',
                data : { positiveWords : JSON.stringify(positiveWords),
                         negativeWords : JSON.stringify(negativeWords),
                         token : this.token },
                success : _.bind(this.buildNewSuggestionsFinish, this),
                dataType : 'json'
            });
        },

        buildNewSuggestionsFinish : function(out)
        {
            // Reject suggestions that come back with wrong token, this is some sort of lock
            if(this.token != out.token)
                return;

            var suggested = out.suggested;
            var weights = out.weights;

            var suggestDom = this.$el.find( '.suggestedWords' ).empty();

            var o = d3.scale.linear()
                .domain([_.min(weights), _.max(weights)])
                .range(["blue", "red"]);

            for(var i = 0; i < suggested.length; i++)
            {
                var wordEl = $( this.wordSuggestTemplate({ word : suggested[i] }) )
                    .appendTo( suggestDom )
                    .css('color', o(weights[i]));

                wordEl.find('.g').click(_.bind(_.partial(this.addPositiveWord, suggested[i]), this));
                wordEl.find('.b').click(_.bind(_.partial(this.addNegativeWord, suggested[i]), this));
            }
        },

        getState : function()
        {
            return { positiveWords : _.keys(this.positiveSelectors),
                     negativeWords : _.keys(this.negativeSelectors) };
        },

        initialize : function(options)
        {
            this.el = options.el;
            this.$el = $( this.el );

            this.positiveSelectors = {};
            this.negativeSelectors = {};
        },
        
        render : function()
        {
            var template = _.template($( '#wordGroupTemplate' ).text());

            this.wordTemplate = _.template($( '#wordTemplate' ).text());
            this.wordSuggestTemplate = _.template($( '#wordSuggestTemplate' ).text());

            var newEl = $( template({ id : this.id }) );

            this.$el.replaceWith( newEl );
            this.el = newEl[0];
            this.$el = newEl;

            this.$el.find( '.removeSpan button' ).click(_.bind(this.remove, this));
        },
    }
);

Words.Controller = Backbone.View.extend(
    {
        events : {
            "click #addManualWords" : "addManualWords",
            "click #search" : "search",
            "keypress #words" : "keySearch"
        },

        initialize : function(options)
        {
            this.wordGroup = undefined;
        },

        addManualWords : function()
        {
            var positiveWords = this.$el.find( "#words" ).val().trim().split(" ");
            var negativeWords = [];//this.$el.find( "#negativeWords" ).val().trim().split(" ");

            if((positiveWords.length + negativeWords.length) > 0)
            {
                for(var i = 0; i < positiveWords.length; i++)
                {
                    if(positiveWords[i].length > 0)
                        this.wordGroup.addPositiveWord(positiveWords[i]);
                }

                for(var i = 0; i < negativeWords.length; i++)
                {
                    if(negativeWords[i].length > 0)
                        this.wordGroup.addNegativeWord(negativeWords[i]);
                }

                //if(this.wordGroup.getState().words.length == 0)
                //    this.wordGroup.remove();
            }
        },

        keySearch : function(e)
        {
            if(e.which == 13)
            {
                this.addManualWords();
            }
        },

        search : function()
        {
            var state = this.wordGroup.getState();

            this.token = Math.random();

            $.ajax({
                type : 'POST',
                url : 'getRankings',
                data : { token : this.token,
                         positiveWords : JSON.stringify(state.positiveWords),
                         negativeWords : JSON.stringify(state.negativeWords) },
                success : _.bind(this.handleSearchResponse, this),
                dataType : 'json'
            });
        },

        handleSearchResponse : function(data)
        {
            if(this.token != data.token)
                return;

            var tbody = this.$el.find( '#resultsBody' );

            tbody.empty();

            var rowTemplate = _.template('<tr><td><%= string %></td><td class="paper"><a href="<%= paper.url %>"><%= paper.title %></a></td></tr>');

            for(var i = 0; i < data.rankings['lsi'].length; i++)
            {
                var id = data.rankings['lsi'][i];

                var row = $( rowTemplate( data.sentences[id[0]] ) );

                tbody.append( row );
            }
        },
        
        render : function()
        {
            this.$el = $("body");
            this.el = this.$el[0];

            var div = $( '<span></span>' ).appendTo( this.$el.find( '#wordGroups' ) );
            
            var wg = new Words.WordGroup({ el : div[0], words : ['oxide', 'layer'] });
            
            this.wordGroup = wg;

            wg.render();
            
            //$("#addWordGroup").click(_.bind(this.addWordGroup, this));
            this.delegateEvents();
        },
    }
);

$( document ).ready( function() {
    var cont = new Words.Controller();
    
    cont.render();
    
    $( "#addManualWords" ).click();
    $( "#search" ).click();
});

