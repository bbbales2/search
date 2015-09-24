d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var Graphics = Graphics || {}

Graphics.Controller = Backbone.View.extend(
    {
        events : {
        },

        initialize : function(attributes)
        {
            this.locked = -1;

            $( window ).resize(_.bind(this.render, this));
        },
        
        render : function()
        {
            this.el = $("#chart");

            var width = parseFloat(this.el.css('width')),
            height = parseFloat(this.el.css('height'));

            this.svg = d3.select( this.el[0] ).append("svg")
                .attr("width", width)
                .attr("height", height);

            var words = ['Ni', 'Al'];

            this.nodes = [];

            for(var i = 0; i < words.length; i++) {
                this.nodes.push({
                    x : width / 2.0 + Math.random() * 20 - 10,
                    y : height / 2.0 + Math.random() * 20 - 10,
                    word : words[i],
                    r : this.getWordWidth(words[i])
                });
            }

            this.mainForce = d3.layout.force()
                .nodes(this.nodes)
                .size([width, height])
                .on("tick", _.bind(this.mainTick, this))
                .charge(-100);

            this.wordSelectNodes = [];
            this.wordSelectLinks = [];

            this.wordSelectForce = d3.layout.force()
                .nodes(this.wordSelectNodes)
                .links(this.wordSelectLinks)
                //.gravity(0)
                .size([width, height])
                .on("tick", _.bind(this.wordSelectorTick, this))
                .charge(-800);

            this.mainG = this.svg.append("g");
            this.wordSelectG = this.svg.append("g");

            this.updateMainGraph();
        },

        mainTick : function(e) {
            // Push different nodes in different directions for clustering.
            this.circles.attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
        },

        wordSelectorTick : function(e) {
            this.wordSelectLines.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            this.wordSelectCircles.attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
        },

        fillWordSelectorGraph : function(node) {
            var otherWords = ["here", "are", "some", "other", "words"];

            this.wordSelectNodes.length = 0;
            this.wordSelectLinks.length = 0;

            var centerNode = {
                word : node.word,
                x : node.x,
                y : node.y,
                r : node.r * 1.2,
                fixed : true
            };

            for(var i in otherWords)
            {
                this.wordSelectNodes.push({
                    word : otherWords[i],
                    x : node.x + (Math.random() * 20 - 5),
                    y : node.y + (Math.random() * 20 - 5),
                    r : this.getWordWidth(otherWords[i])
                });

                this.wordSelectLinks.push({
                    source : centerNode,
                    target : this.wordSelectNodes[this.wordSelectNodes.length - 1]
                });
            }

            this.wordSelectNodes.push(centerNode)
        },

        emptyWordSelectorGraph : function() {
            this.wordSelectNodes.length = 0;
            this.wordSelectLinks.length = 0;
        },

        getWordWidth : function(string) {
            var element = this.svg.append("text").text(string);

            var width = element[0][0].getBBox().width;

            element.remove();

            return width;
        },

        updateWordSelectorGraph : function() {
            this.wordSelectCircles = this.wordSelectG.selectAll(".circles")
                .data(this.wordSelectNodes, function(d) {
                    return d.word;
                });

            this.wordSelectLines = this.wordSelectG.selectAll('.line')
                .data(this.wordSelectLinks);

            this.wordSelectLines.enter().append("line")
                .attr("class", "line");

            var wordSelectGs = this.wordSelectCircles.enter().append("g")
                .attr("class", "circles")
                .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; })
                .on("mouseenter", _.partial(function(controller, o, i) {
                    d3.select(this).moveToFront()

                    if(o.fixed) return;

                    d3.select(this).select('circle')
                        .transition()
                        .duration("200")
                        .attr("r", o.r * 1.2);
                }, this))
                .on("mouseleave", _.partial(function(controller, o, i) {
                    if(o.fixed) return;

                    d3.select(this).select('circle')
                        .transition()
                        .duration("200")
                        .attr("r", o.r);
                }, this))
                .on("mousedown", _.partial(function(controller, o, i) {
                    controller.emptyWordSelectorGraph();
                    controller.updateWordSelectorGraph();

                    controller.locked = -1;
                    controller.mainForce.start();

                    controller.updateMainGraph();
                }, this));

            wordSelectGs.append("circle")
                .attr("r", function(d) { return d.r; })
                .attr("fill", "white")
                .attr("stroke", "black");

            wordSelectGs.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")//function(d) { return d.r / 2; }
                .text(function(d) { return d.word; })

            this.wordSelectCircles.exit()
                .on("mouseenter", null)
                .on("mouseleave", null)
                .on("mousedown", null)
                .select('circle')
                .transition()
                .duration("200")
                .attr("r", 0)
                .each("end", function() { d3.select(this.parentNode).remove() });

            this.wordSelectLines.exit().remove();

            if(this.wordSelectNodes.length > 0)
                this.wordSelectForce.start();

            console.log('enter');
        },

        updateMainGraph : function() {
            var fill = d3.scale.category10();

            this.circles = this.mainG.selectAll(".circles")
                .data(this.nodes, function(d) {
                    return d.word;
                });

            var circleGs = this.circles.enter().append("g")
                .attr("class", "circles")
                .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; })
                .on("mouseover", function(o, i) {
                    d3.select(this).moveToFront();

                    d3.select(this).select('circle')
                        .transition()
                        .duration("200")
                        .attr("r", o.r * 1.2);
                })
                .on("mouseout", function(o, i) {
                    d3.select(this).select('circle')
                        .transition()
                        .duration("200")
                        .attr("r", o.r);
                })
                .on("mousedown", _.partial(function(controller, o, i) {
                    if(controller.locked = true)
                    {
                        controller.locked = true;
                        controller.mainForce.stop();
                        
                        controller.fillWordSelectorGraph(o);
                        controller.updateWordSelectorGraph();
                    }
                }, this));

            circleGs.append("circle")
                .attr("r", function(d) { return d.r; })
                .style("fill", function(d, i) { return fill(i & 3); })
                .style("stroke", function(d, i) { return d3.rgb(fill(i & 3)).darker(2); });
            //.call(force.drag)

            circleGs.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")//function(d) { return d.r / 2; }
                .text(function(d) { return d.word; })

            this.circles.exit().remove();

            this.mainForce.start();
        }
    }
);

$( document ).ready( function() {
    var cont = new Graphics.Controller();

    cont.render();
});
