var Words = Words || {}

Words.WordGroup = Backbone.View.extend(
    {
        addWord : function(word)
        {
            if(word in this.selectors)
                return;

            this.selectors[word] = $( this.wordTemplate({ word : word } ) ).appendTo( this.$el.find('.words') )
                .click(_.bind(_.partial(this.removeWord, word), this));

            this.buildNewSuggestions();
        },

        removeWord : function(word, e)
        {
            this.selectors[word].remove();
            delete this.selectors[word];

            if(_.keys(this.selectors).length == 0)
                this.remove();
            else
                this.buildNewSuggestions();
        },

        buildNewSuggestions : function()
        {
            var words = _.keys(this.selectors);

            var stemmed = words.map(function(element) { return stemmer(element); });

            var suggested = [];
            for(var i = 0; i < stemmed.length; i++)
            {
                if(stemmed[i] in Words.combos)
                    suggested = suggested.concat(Words.combos[stemmed[i]]);
            }

            suggested.sort(function(a, b) { return -(a[1] - b[1]); });

            suggested = _.difference(suggested.map(function(element) { return element[0]; }), stemmed);

            var suggestDom = this.$el.find( '.suggestedWords' ).empty();

            for(var i = 0; i < Math.min(8, suggested.length); i++)
            {
                $( this.wordTemplate({ word : suggested[i] }) ).appendTo( suggestDom )
                    .click(_.bind(_.partial(this.addWord, suggested[i]), this));
            }
        },

        getState : function()
        {
            return [_.keys(this.selectors), this.$el.find( 'input.good' ).prop('checked')];
            //console.log('hi');
        },

        initialize : function(options)
        {
            this.id = options.id;
            this.word = options.word;
            this.el = options.el;
            this.$el = $( this.el );

            this.selectors = {};
        },
        
        render : function()
        {
            var template = _.template($( '#wordGroupTemplate' ).text());

            this.wordTemplate = _.template($( '#wordTemplate' ).text());

            this.$el.html( template({ id : this.id }) );

            this.addWord(this.word);
        },
    }
);

Words.Controller = Backbone.View.extend(
    {
        events : {
            "click #addWordGroup" : "addWordGroup"
        },

        initialize : function(options)
        {
            this.wordGroups = [];
        },

        addWordGroup : function()
        {
            var word = this.$el.find( "#initialWord" ).val().trim();

            if(word.length > 0)
            {
                var div = $( '<div></div>' ).appendTo( this.$el.find( '#wordGroups' ) );

                this.wordGroups.push(new Words.WordGroup({ el : div[0], word : word, id : this.wordGroups.length }));
                
                this.wordGroups[this.wordGroups.length - 1].render();
            }
        },

        search : function()
        {
            $.
        },
        
        render : function()
        {
            this.$el = $("body");
            this.el = this.$el[0];

            //$("#addWordGroup").click(_.bind(this.addWordGroup, this));
            this.delegateEvents();
        },
    }
);

$.getJSON("webCombos.json", function(data) 
{
    Words.combos = data;

    $( document ).ready( function() {
        var cont = new Words.Controller();
        
        cont.render();

        $( "#addWordGroup" ).click();
    });
});

