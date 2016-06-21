(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\maze engine\\client\\app\\app.js":[function(require,module,exports){
(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze"),
		UserInteraction = require("../app/core/user-interaction"),
		interaction = null;

	function Main(){}

	Main.prototype = {
		editor : null,
		maze : null,
		canvas : null,
		context : null,
		init : function(){

			this.editor = ace.edit("editor");
		    this.editor.setTheme("ace/theme/monokai");
		    this.editor.getSession().setMode("ace/mode/javascript");

			this.canvas = document.querySelector(".main-canvas");
			this.context = this.canvas.getContext("2d");

			this.canvas.width = Config.CELL_SIZE * Config.WIDTH;
			this.canvas.height = Config.CELL_SIZE * Config.HEIGHT;

			this.fetchMazeAndDraw();

			this.bindEvents();
		},
		fetchMazeAndDraw:function(){
			this.fetchMaze().then(function(cells){
				this.maze = new Maze({
					cells : cells
				});
				interaction = new UserInteraction({
					cell : cells[0][0]
				});
				this.draw();
			}.bind(this));
		},
		bindEvents : function(){
			var btnDrawSolution = document.getElementById("input-draw-solution");
			
			btnDrawSolution.addEventListener("click",this.handleClickDrawSolution.bind(this),false);
			
			var btnNewMaze = document.getElementById("input-new-maze");

			btnNewMaze.addEventListener("click",this.handleClickNewMaze.bind(this),false);

		},
		handleClickNewMaze : function(){
			this.maze.stopAnimation();
			this.fetchMazeAndDraw();
		},
		handleClickDrawSolution : function(){

			var initialNode = this.maze.cells[0][0];
			var codeSolution = this.editor.getSession().getValue();

			interaction.init({
				cells : this.maze.cells,
				cell : {
					x : initialNode.x,
					y : initialNode.y,
					width : initialNode.width,
					height : initialNode.height,
					walls : {
						rigth : initialNode.walls.rigth,
						left : initialNode.walls.left,
						top : initialNode.walls.top,
						bottom : initialNode.walls.bottom
					}
				}
			});

			interaction.run = eval(codeSolution);	

			interaction.run();

			var solution = interaction.moves;

			if(this.maze.animationInterval && this.maze.mainInterval){
				this.maze.stopAnimation();
				this.maze.clearCell(this.context,this.maze.lastNode);
			}

			if(solution && solution.length){
				this.maze.drawSolution(this.context,solution);
			}
		},
		draw : function(){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			this.maze.draw(this.context);
		},
		fetchMaze : function(){
			return fetch("/api/v1/maze?width="+Config.WIDTH+"&height="+Config.HEIGHT,{
				method: 'GET', 
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
		fetchMazeSolution : function(data){
			return fetch("/api/v1/maze/solution",{
				method: 'POST', 
				body : JSON.stringify(data),
				headers: new Headers({
					'Content-Type': 'application/json'
				})
			}).then(function(response){
				return response.json();
			});
		},
	};

	main = new Main();

	window.onload = main.init.bind(main);

}());
},{"../app/core/config-maze":"C:\\maze engine\\client\\app\\core\\config-maze.js","../app/core/maze":"C:\\maze engine\\client\\app\\core\\maze.js","../app/core/user-interaction":"C:\\maze engine\\client\\app\\core\\user-interaction.js"}],"C:\\maze engine\\client\\app\\core\\cell.js":[function(require,module,exports){
module.exports = (function(){

	var Wall = require("./wall"),
		Config = require("./config-maze");

	function Cell(rawCell){
		this.walls = {
			left : null,
			rigth : null,
			top : null,
			bottom : null
		};
		this.init(rawCell);
	}

	Cell.prototype = {
		names : ["left","rigth","top","bottom"],
		x : 0,
		y : 0,
		width : Config.CELL_SIZE,
		height : Config.CELL_SIZE,
		visited : false,
		walls : {
			left : null,
			rigth : null,
			top : null,
			bottom : null
		},
		init : function(props){
			this.x = props.x;
			this.y = props.y;
			this.width = props.width;
			this.height = props.height;
			this.createWalls(props.walls);
		},
		createWalls : function(props){
			var self = this;
			for(var p in props){
				var obj = props[p];
				if(!obj){
					this.walls[p] = null;
				}else{
					this.walls[p] = new Wall({
						name : p,
						x : obj.x,
						y : obj.y,
						height : obj.height,
						width : obj.width
					});
				}
			}
		},
		draw : function(context){
			this.names.forEach(function(name){
				var wall = this.walls[name];
				if(wall){
					wall.draw(context);
				}
			},this);
		}
	};

	return Cell;

}());
},{"./config-maze":"C:\\maze engine\\client\\app\\core\\config-maze.js","./wall":"C:\\maze engine\\client\\app\\core\\wall.js"}],"C:\\maze engine\\client\\app\\core\\config-maze.js":[function(require,module,exports){
module.exports = {
	CELL_SIZE : 20,
	WIDTH :20,
	HEIGHT : 20
};
},{}],"C:\\maze engine\\client\\app\\core\\maze.js":[function(require,module,exports){
module.exports = (function(){

	var Cell = require("./cell");

	function Maze(props){
		this.init(props);
	}

	Maze.prototype = {
		width : 0,
		height : 0,
		cells : [],
		solution : [],
		animationInterval : null,
		mainInterval : null,
		lastNode : null,
		init : function(props){
			this.width = props.cells.length;
			this.height = props.cells[0].length;
			this.createCells(props.cells);
		},
		createCells : function(rawCells){
			for (var i = 0; i < rawCells.length; i++) {
		        this.cells[i] = [];
		        for (var j = 0; j < rawCells[i].length; j++) {
		            this.cells[i][j] = new Cell(rawCells[i][j]);
		        }
		    }
		},
		draw : function(context){
			this.fillCell(context,this.cells[0][0], "blue");
			this.fillCell(context,this.cells[this.width - 1][this.height - 1], "red");

			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		drawSolution : function(context,sol){

			this.solution = sol;

			this.lastNode = this.cells[0][0];

            this.animationInterval = requestAnimationFrame(this.animatePath.bind(this,context));

            this.mainInterval = setInterval(function(){
            	this.animatePath(context);
            }.bind(this),250);

		},
		animatePath:function(context){
        	
			if(this.solution.length === 0){
				this.clearCell(context,this.lastNode);
				this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	this.clearCell(context,this.lastNode);

        	
        	var cell = this.solution.shift();
        	
        	if(Math.abs(cell.x - this.lastNode.x) > 1 ||
        		Math.abs(cell.y - this.lastNode.y) > 1){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x > this.lastNode.x && this.lastNode.walls.rigth){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.y < this.lastNode.y && this.lastNode.walls.top){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	if(cell.y > this.lastNode.y && this.lastNode.walls.bottom){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x < this.lastNode.x && this.lastNode.walls.left){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	this.fillCell(context,cell, "blue");
        	
        	this.lastNode = cell;
		},
		stopAnimation : function(){
			cancelAnimationFrame(this.animationInterval);
        	clearInterval(this.mainInterval);
        	this.animationInterval = null;
        	this.mainInterval = null;
		},
		fillCell : function(context,cell,color){
			context.fillStyle = color;
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.fillRect(x,y,cell.width / 2,cell.height / 2);
		},
		clearCell : function(context,cell){
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.clearRect(x,y,cell.width / 2,cell.height / 2);
		}
	};

	return Maze;

}());
},{"./cell":"C:\\maze engine\\client\\app\\core\\cell.js"}],"C:\\maze engine\\client\\app\\core\\user-interaction.js":[function(require,module,exports){
module.exports = (function(){

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		cells : [],
		cell : null,
		x : 0,
		y : 0,
		moves : [],
		init : function(props){
			this.cell = props.cell;
			this.cells = props.cells;
			this.moves = [];
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			return this.cell.x === this.cells.length && this.cell.y === this.cells[0].length;
		},
		moveTo : function(direction){
			if(!this.canMoveTo(direction)){
				return null;
			}
			var nextMove = this.getNextMove(direction);
			this.moves.push(nextMove);
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = this.moves[this.moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				this.cell.x-=1;
				break;
				case 'rigth' : 
				this.cell.x += 1;
				break;
				case 'bottom' : 
				this.cell.y += 1;
				break;
				case 'top' : 
				this.cell.y -= 1;
				break;
			}

			return this.getSingleMove();
			
		},
		getSingleMove : function(){
			var initialNode = this.cells[this.cell.x][this.cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					rigth : initialNode.walls.rigth,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		run : function(){
			//this method could be overrided by user
		},
	};


	return UserInteraction;

}());
},{}],"C:\\maze engine\\client\\app\\core\\wall.js":[function(require,module,exports){
module.exports = (function(){

	function Wall(props){
		this.name = props.name;
		this.color = props.color || this.color;
		this.x = props.x;
		this.y = props.y;
		this.width = props.width;
		this.height = props.height;
	}

	Wall.prototype = {
		x : 0,
		y : 0,
		height : 0,
		width : 0,
		name : "",
		color : "gray",
		draw : function(context){
			this[this.name](context);
		},
		left:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo(this.x * this.width,(this.y + 1) * this.height);
			context.stroke();
		},
		rigth:function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo((this.x * this.width) + this.width,this.y * this.height);
			context.lineTo((this.x + 1) * this.width, (this.y + 1) * this.height);
			context.stroke();
		},
		top : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,this.y * this.height);
			context.lineTo((this.x * this.width) + this.width,this.y * this.height);
			context.stroke();	
		},
		bottom : function(context){
			context.strokeStyle = this.color;
			context.beginPath();
			context.moveTo(this.x * this.width,(this.y * this.height) + this.height);
			context.lineTo((this.x * this.width) + this.width,(this.y + 1) * this.height);
			context.stroke();
		}
	};

	return Wall;

}());
},{}]},{},["C:\\maze engine\\client\\app\\app.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvYXBwL2FwcC5qcyIsImNsaWVudC9hcHAvY29yZS9jZWxsLmpzIiwiY2xpZW50L2FwcC9jb3JlL2NvbmZpZy1tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL21hemUuanMiLCJjbGllbnQvYXBwL2NvcmUvdXNlci1pbnRlcmFjdGlvbi5qcyIsImNsaWVudC9hcHAvY29yZS93YWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oKXtcclxuXHJcblx0XCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5cdHZhciBtYWluID0gbnVsbCxcclxuXHRcdE1hemUgPSByZXF1aXJlKFwiLi4vYXBwL2NvcmUvbWF6ZVwiKSxcclxuXHRcdENvbmZpZyA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS9jb25maWctbWF6ZVwiKSxcclxuXHRcdFVzZXJJbnRlcmFjdGlvbiA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS91c2VyLWludGVyYWN0aW9uXCIpLFxyXG5cdFx0aW50ZXJhY3Rpb24gPSBudWxsO1xyXG5cclxuXHRmdW5jdGlvbiBNYWluKCl7fVxyXG5cclxuXHRNYWluLnByb3RvdHlwZSA9IHtcclxuXHRcdGVkaXRvciA6IG51bGwsXHJcblx0XHRtYXplIDogbnVsbCxcclxuXHRcdGNhbnZhcyA6IG51bGwsXHJcblx0XHRjb250ZXh0IDogbnVsbCxcclxuXHRcdGluaXQgOiBmdW5jdGlvbigpe1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3IgPSBhY2UuZWRpdChcImVkaXRvclwiKTtcclxuXHRcdCAgICB0aGlzLmVkaXRvci5zZXRUaGVtZShcImFjZS90aGVtZS9tb25va2FpXCIpO1xyXG5cdFx0ICAgIHRoaXMuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRNb2RlKFwiYWNlL21vZGUvamF2YXNjcmlwdFwiKTtcclxuXHJcblx0XHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tYWluLWNhbnZhc1wiKTtcclxuXHRcdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHRcdFx0dGhpcy5jYW52YXMud2lkdGggPSBDb25maWcuQ0VMTF9TSVpFICogQ29uZmlnLldJRFRIO1xyXG5cdFx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSBDb25maWcuQ0VMTF9TSVpFICogQ29uZmlnLkhFSUdIVDtcclxuXHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplQW5kRHJhdygpO1xyXG5cclxuXHRcdFx0dGhpcy5iaW5kRXZlbnRzKCk7XHJcblx0XHR9LFxyXG5cdFx0ZmV0Y2hNYXplQW5kRHJhdzpmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmZldGNoTWF6ZSgpLnRoZW4oZnVuY3Rpb24oY2VsbHMpe1xyXG5cdFx0XHRcdHRoaXMubWF6ZSA9IG5ldyBNYXplKHtcclxuXHRcdFx0XHRcdGNlbGxzIDogY2VsbHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpbnRlcmFjdGlvbiA9IG5ldyBVc2VySW50ZXJhY3Rpb24oe1xyXG5cdFx0XHRcdFx0Y2VsbCA6IGNlbGxzWzBdWzBdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGhpcy5kcmF3KCk7XHJcblx0XHRcdH0uYmluZCh0aGlzKSk7XHJcblx0XHR9LFxyXG5cdFx0YmluZEV2ZW50cyA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBidG5EcmF3U29sdXRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0LWRyYXctc29sdXRpb25cIik7XHJcblx0XHRcdFxyXG5cdFx0XHRidG5EcmF3U29sdXRpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5oYW5kbGVDbGlja0RyYXdTb2x1dGlvbi5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHRcdFx0XHJcblx0XHRcdHZhciBidG5OZXdNYXplID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dC1uZXctbWF6ZVwiKTtcclxuXHJcblx0XHRcdGJ0bk5ld01hemUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsdGhpcy5oYW5kbGVDbGlja05ld01hemUuYmluZCh0aGlzKSxmYWxzZSk7XHJcblxyXG5cdFx0fSxcclxuXHRcdGhhbmRsZUNsaWNrTmV3TWF6ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMubWF6ZS5zdG9wQW5pbWF0aW9uKCk7XHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplQW5kRHJhdygpO1xyXG5cdFx0fSxcclxuXHRcdGhhbmRsZUNsaWNrRHJhd1NvbHV0aW9uIDogZnVuY3Rpb24oKXtcclxuXHJcblx0XHRcdHZhciBpbml0aWFsTm9kZSA9IHRoaXMubWF6ZS5jZWxsc1swXVswXTtcclxuXHRcdFx0dmFyIGNvZGVTb2x1dGlvbiA9IHRoaXMuZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpO1xyXG5cclxuXHRcdFx0aW50ZXJhY3Rpb24uaW5pdCh7XHJcblx0XHRcdFx0Y2VsbHMgOiB0aGlzLm1hemUuY2VsbHMsXHJcblx0XHRcdFx0Y2VsbCA6IHtcclxuXHRcdFx0XHRcdHggOiBpbml0aWFsTm9kZS54LFxyXG5cdFx0XHRcdFx0eSA6IGluaXRpYWxOb2RlLnksXHJcblx0XHRcdFx0XHR3aWR0aCA6IGluaXRpYWxOb2RlLndpZHRoLFxyXG5cdFx0XHRcdFx0aGVpZ2h0IDogaW5pdGlhbE5vZGUuaGVpZ2h0LFxyXG5cdFx0XHRcdFx0d2FsbHMgOiB7XHJcblx0XHRcdFx0XHRcdHJpZ3RoIDogaW5pdGlhbE5vZGUud2FsbHMucmlndGgsXHJcblx0XHRcdFx0XHRcdGxlZnQgOiBpbml0aWFsTm9kZS53YWxscy5sZWZ0LFxyXG5cdFx0XHRcdFx0XHR0b3AgOiBpbml0aWFsTm9kZS53YWxscy50b3AsXHJcblx0XHRcdFx0XHRcdGJvdHRvbSA6IGluaXRpYWxOb2RlLndhbGxzLmJvdHRvbVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpbnRlcmFjdGlvbi5ydW4gPSBldmFsKGNvZGVTb2x1dGlvbik7XHRcclxuXHJcblx0XHRcdGludGVyYWN0aW9uLnJ1bigpO1xyXG5cclxuXHRcdFx0dmFyIHNvbHV0aW9uID0gaW50ZXJhY3Rpb24ubW92ZXM7XHJcblxyXG5cdFx0XHRpZih0aGlzLm1hemUuYW5pbWF0aW9uSW50ZXJ2YWwgJiYgdGhpcy5tYXplLm1haW5JbnRlcnZhbCl7XHJcblx0XHRcdFx0dGhpcy5tYXplLnN0b3BBbmltYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLm1hemUuY2xlYXJDZWxsKHRoaXMuY29udGV4dCx0aGlzLm1hemUubGFzdE5vZGUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZihzb2x1dGlvbiAmJiBzb2x1dGlvbi5sZW5ndGgpe1xyXG5cdFx0XHRcdHRoaXMubWF6ZS5kcmF3U29sdXRpb24odGhpcy5jb250ZXh0LHNvbHV0aW9uKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsMCx0aGlzLmNhbnZhcy53aWR0aCx0aGlzLmNhbnZhcy5oZWlnaHQpO1xyXG5cdFx0XHR0aGlzLm1hemUuZHJhdyh0aGlzLmNvbnRleHQpO1xyXG5cdFx0fSxcclxuXHRcdGZldGNoTWF6ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBmZXRjaChcIi9hcGkvdjEvbWF6ZT93aWR0aD1cIitDb25maWcuV0lEVEgrXCImaGVpZ2h0PVwiK0NvbmZpZy5IRUlHSFQse1xyXG5cdFx0XHRcdG1ldGhvZDogJ0dFVCcsIFxyXG5cdFx0XHRcdGhlYWRlcnM6IG5ldyBIZWFkZXJzKHtcclxuXHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemVTb2x1dGlvbiA6IGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRyZXR1cm4gZmV0Y2goXCIvYXBpL3YxL21hemUvc29sdXRpb25cIix7XHJcblx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsIFxyXG5cdFx0XHRcdGJvZHkgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcclxuXHRcdFx0XHRoZWFkZXJzOiBuZXcgSGVhZGVycyh7XHJcblx0XHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cdG1haW4gPSBuZXcgTWFpbigpO1xyXG5cclxuXHR3aW5kb3cub25sb2FkID0gbWFpbi5pbml0LmJpbmQobWFpbik7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdHZhciBXYWxsID0gcmVxdWlyZShcIi4vd2FsbFwiKSxcclxuXHRcdENvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZy1tYXplXCIpO1xyXG5cclxuXHRmdW5jdGlvbiBDZWxsKHJhd0NlbGwpe1xyXG5cdFx0dGhpcy53YWxscyA9IHtcclxuXHRcdFx0bGVmdCA6IG51bGwsXHJcblx0XHRcdHJpZ3RoIDogbnVsbCxcclxuXHRcdFx0dG9wIDogbnVsbCxcclxuXHRcdFx0Ym90dG9tIDogbnVsbFxyXG5cdFx0fTtcclxuXHRcdHRoaXMuaW5pdChyYXdDZWxsKTtcclxuXHR9XHJcblxyXG5cdENlbGwucHJvdG90eXBlID0ge1xyXG5cdFx0bmFtZXMgOiBbXCJsZWZ0XCIsXCJyaWd0aFwiLFwidG9wXCIsXCJib3R0b21cIl0sXHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0d2lkdGggOiBDb25maWcuQ0VMTF9TSVpFLFxyXG5cdFx0aGVpZ2h0IDogQ29uZmlnLkNFTExfU0laRSxcclxuXHRcdHZpc2l0ZWQgOiBmYWxzZSxcclxuXHRcdHdhbGxzIDoge1xyXG5cdFx0XHRsZWZ0IDogbnVsbCxcclxuXHRcdFx0cmlndGggOiBudWxsLFxyXG5cdFx0XHR0b3AgOiBudWxsLFxyXG5cdFx0XHRib3R0b20gOiBudWxsXHJcblx0XHR9LFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dGhpcy54ID0gcHJvcHMueDtcclxuXHRcdFx0dGhpcy55ID0gcHJvcHMueTtcclxuXHRcdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0XHR0aGlzLmhlaWdodCA9IHByb3BzLmhlaWdodDtcclxuXHRcdFx0dGhpcy5jcmVhdGVXYWxscyhwcm9wcy53YWxscyk7XHJcblx0XHR9LFxyXG5cdFx0Y3JlYXRlV2FsbHMgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdHZhciBzZWxmID0gdGhpcztcclxuXHRcdFx0Zm9yKHZhciBwIGluIHByb3BzKXtcclxuXHRcdFx0XHR2YXIgb2JqID0gcHJvcHNbcF07XHJcblx0XHRcdFx0aWYoIW9iail7XHJcblx0XHRcdFx0XHR0aGlzLndhbGxzW3BdID0gbnVsbDtcclxuXHRcdFx0XHR9ZWxzZXtcclxuXHRcdFx0XHRcdHRoaXMud2FsbHNbcF0gPSBuZXcgV2FsbCh7XHJcblx0XHRcdFx0XHRcdG5hbWUgOiBwLFxyXG5cdFx0XHRcdFx0XHR4IDogb2JqLngsXHJcblx0XHRcdFx0XHRcdHkgOiBvYmoueSxcclxuXHRcdFx0XHRcdFx0aGVpZ2h0IDogb2JqLmhlaWdodCxcclxuXHRcdFx0XHRcdFx0d2lkdGggOiBvYmoud2lkdGhcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGRyYXcgOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0dGhpcy5uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpe1xyXG5cdFx0XHRcdHZhciB3YWxsID0gdGhpcy53YWxsc1tuYW1lXTtcclxuXHRcdFx0XHRpZih3YWxsKXtcclxuXHRcdFx0XHRcdHdhbGwuZHJhdyhjb250ZXh0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sdGhpcyk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIENlbGw7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdENFTExfU0laRSA6IDIwLFxyXG5cdFdJRFRIIDoyMCxcclxuXHRIRUlHSFQgOiAyMFxyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCl7XHJcblxyXG5cdHZhciBDZWxsID0gcmVxdWlyZShcIi4vY2VsbFwiKTtcclxuXHJcblx0ZnVuY3Rpb24gTWF6ZShwcm9wcyl7XHJcblx0XHR0aGlzLmluaXQocHJvcHMpO1xyXG5cdH1cclxuXHJcblx0TWF6ZS5wcm90b3R5cGUgPSB7XHJcblx0XHR3aWR0aCA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0Y2VsbHMgOiBbXSxcclxuXHRcdHNvbHV0aW9uIDogW10sXHJcblx0XHRhbmltYXRpb25JbnRlcnZhbCA6IG51bGwsXHJcblx0XHRtYWluSW50ZXJ2YWwgOiBudWxsLFxyXG5cdFx0bGFzdE5vZGUgOiBudWxsLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0dGhpcy53aWR0aCA9IHByb3BzLmNlbGxzLmxlbmd0aDtcclxuXHRcdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5jZWxsc1swXS5sZW5ndGg7XHJcblx0XHRcdHRoaXMuY3JlYXRlQ2VsbHMocHJvcHMuY2VsbHMpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZUNlbGxzIDogZnVuY3Rpb24ocmF3Q2VsbHMpe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJhd0NlbGxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHQgICAgICAgIHRoaXMuY2VsbHNbaV0gPSBbXTtcclxuXHRcdCAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByYXdDZWxsc1tpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0ICAgICAgICAgICAgdGhpcy5jZWxsc1tpXVtqXSA9IG5ldyBDZWxsKHJhd0NlbGxzW2ldW2pdKTtcclxuXHRcdCAgICAgICAgfVxyXG5cdFx0ICAgIH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzW3RoaXMud2lkdGggLSAxXVt0aGlzLmhlaWdodCAtIDFdLCBcInJlZFwiKTtcclxuXHJcblx0XHRcdHRoaXMuY2VsbHMuZm9yRWFjaChmdW5jdGlvbiAocm93cykge1xyXG5cdFx0XHRcdHJvd3MuZm9yRWFjaChmdW5jdGlvbihjZWxsKXtcclxuXHRcdFx0XHRcdGNlbGwuZHJhdyhjb250ZXh0KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0ZHJhd1NvbHV0aW9uIDogZnVuY3Rpb24oY29udGV4dCxzb2wpe1xyXG5cclxuXHRcdFx0dGhpcy5zb2x1dGlvbiA9IHNvbDtcclxuXHJcblx0XHRcdHRoaXMubGFzdE5vZGUgPSB0aGlzLmNlbGxzWzBdWzBdO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1hdGVQYXRoLmJpbmQodGhpcyxjb250ZXh0KSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1haW5JbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIFx0dGhpcy5hbmltYXRlUGF0aChjb250ZXh0KTtcclxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpLDI1MCk7XHJcblxyXG5cdFx0fSxcclxuXHRcdGFuaW1hdGVQYXRoOmZ1bmN0aW9uKGNvbnRleHQpe1xyXG4gICAgICAgIFx0XHJcblx0XHRcdGlmKHRoaXMuc29sdXRpb24ubGVuZ3RoID09PSAwKXtcclxuXHRcdFx0XHR0aGlzLmNsZWFyQ2VsbChjb250ZXh0LHRoaXMubGFzdE5vZGUpO1xyXG5cdFx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0dGhpcy5jbGVhckNlbGwoY29udGV4dCx0aGlzLmxhc3ROb2RlKTtcclxuXHJcbiAgICAgICAgXHRcclxuICAgICAgICBcdHZhciBjZWxsID0gdGhpcy5zb2x1dGlvbi5zaGlmdCgpO1xyXG4gICAgICAgIFx0XHJcbiAgICAgICAgXHRpZihNYXRoLmFicyhjZWxsLnggLSB0aGlzLmxhc3ROb2RlLngpID4gMSB8fFxyXG4gICAgICAgIFx0XHRNYXRoLmFicyhjZWxsLnkgLSB0aGlzLmxhc3ROb2RlLnkpID4gMSl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpO1xyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0aWYoY2VsbC54ID4gdGhpcy5sYXN0Tm9kZS54ICYmIHRoaXMubGFzdE5vZGUud2FsbHMucmlndGgpe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuICAgICAgICBcdFx0cmV0dXJuO1xyXG4gICAgICAgIFx0fVxyXG5cclxuICAgICAgICBcdGlmKGNlbGwueSA8IHRoaXMubGFzdE5vZGUueSAmJiB0aGlzLmxhc3ROb2RlLndhbGxzLnRvcCl7XHJcbiAgICAgICAgXHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcbiAgICAgICAgXHRcdHRoaXMuc3RvcEFuaW1hdGlvbigpXHJcbiAgICAgICAgXHRcdHJldHVybjtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihjZWxsLnkgPiB0aGlzLmxhc3ROb2RlLnkgJiYgdGhpcy5sYXN0Tm9kZS53YWxscy5ib3R0b20pe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKTtcclxuICAgICAgICBcdFx0cmV0dXJuO1xyXG4gICAgICAgIFx0fVxyXG5cclxuICAgICAgICBcdGlmKGNlbGwueCA8IHRoaXMubGFzdE5vZGUueCAmJiB0aGlzLmxhc3ROb2RlLndhbGxzLmxlZnQpe1xyXG4gICAgICAgIFx0XHR0aGlzLmZpbGxDZWxsKGNvbnRleHQsdGhpcy5jZWxsc1swXVswXSwgXCJibHVlXCIpO1xyXG4gICAgICAgIFx0XHR0aGlzLnN0b3BBbmltYXRpb24oKVxyXG4gICAgICAgIFx0XHRyZXR1cm47XHJcbiAgICAgICAgXHR9XHJcblxyXG4gICAgICAgIFx0dGhpcy5maWxsQ2VsbChjb250ZXh0LGNlbGwsIFwiYmx1ZVwiKTtcclxuICAgICAgICBcdFxyXG4gICAgICAgIFx0dGhpcy5sYXN0Tm9kZSA9IGNlbGw7XHJcblx0XHR9LFxyXG5cdFx0c3RvcEFuaW1hdGlvbiA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwpO1xyXG4gICAgICAgIFx0Y2xlYXJJbnRlcnZhbCh0aGlzLm1haW5JbnRlcnZhbCk7XHJcbiAgICAgICAgXHR0aGlzLmFuaW1hdGlvbkludGVydmFsID0gbnVsbDtcclxuICAgICAgICBcdHRoaXMubWFpbkludGVydmFsID0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRmaWxsQ2VsbCA6IGZ1bmN0aW9uKGNvbnRleHQsY2VsbCxjb2xvcil7XHJcblx0XHRcdGNvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XHJcblx0XHRcdHZhciB4ID0gKGNlbGwueCAqIGNlbGwud2lkdGgpICsgNTtcclxuXHRcdFx0dmFyIHkgPSAoY2VsbC55ICogY2VsbC5oZWlnaHQpICsgNTtcclxuXHRcdFx0Y29udGV4dC5maWxsUmVjdCh4LHksY2VsbC53aWR0aCAvIDIsY2VsbC5oZWlnaHQgLyAyKTtcclxuXHRcdH0sXHJcblx0XHRjbGVhckNlbGwgOiBmdW5jdGlvbihjb250ZXh0LGNlbGwpe1xyXG5cdFx0XHR2YXIgeCA9IChjZWxsLnggKiBjZWxsLndpZHRoKSArIDU7XHJcblx0XHRcdHZhciB5ID0gKGNlbGwueSAqIGNlbGwuaGVpZ2h0KSArIDU7XHJcblx0XHRcdGNvbnRleHQuY2xlYXJSZWN0KHgseSxjZWxsLndpZHRoIC8gMixjZWxsLmhlaWdodCAvIDIpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBNYXplO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHRmdW5jdGlvbiBVc2VySW50ZXJhY3Rpb24ocHJvcHMpe1xyXG5cdFx0dGhpcy5pbml0KHByb3BzKTtcclxuXHR9XHJcblxyXG5cdFVzZXJJbnRlcmFjdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0XHRjZWxscyA6IFtdLFxyXG5cdFx0Y2VsbCA6IG51bGwsXHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0bW92ZXMgOiBbXSxcclxuXHRcdGluaXQgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdHRoaXMuY2VsbCA9IHByb3BzLmNlbGw7XHJcblx0XHRcdHRoaXMuY2VsbHMgPSBwcm9wcy5jZWxscztcclxuXHRcdFx0dGhpcy5tb3ZlcyA9IFtdO1xyXG5cdFx0XHR0aGlzLnggPSAwO1xyXG5cdFx0XHR0aGlzLnkgPSAwO1xyXG5cdFx0fSxcclxuXHRcdGlzQ29tcGxldGUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jZWxsLnggPT09IHRoaXMuY2VsbHMubGVuZ3RoICYmIHRoaXMuY2VsbC55ID09PSB0aGlzLmNlbGxzWzBdLmxlbmd0aDtcclxuXHRcdH0sXHJcblx0XHRtb3ZlVG8gOiBmdW5jdGlvbihkaXJlY3Rpb24pe1xyXG5cdFx0XHRpZighdGhpcy5jYW5Nb3ZlVG8oZGlyZWN0aW9uKSl7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHRcdFx0dmFyIG5leHRNb3ZlID0gdGhpcy5nZXROZXh0TW92ZShkaXJlY3Rpb24pO1xyXG5cdFx0XHR0aGlzLm1vdmVzLnB1c2gobmV4dE1vdmUpO1xyXG5cdFx0XHRyZXR1cm4gbmV4dE1vdmU7XHJcblx0XHR9LFxyXG5cdFx0Y2FuTW92ZVRvIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHRcdFx0dmFyIGxhc3RNb3ZlID0gdGhpcy5tb3Zlc1t0aGlzLm1vdmVzLmxlbmd0aCAtIDFdIHx8IHRoaXMuZ2V0U2luZ2xlTW92ZSgpO1xyXG5cdFx0XHRyZXR1cm4gbGFzdE1vdmUud2FsbHNbZGlyZWN0aW9uXSA9PT0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRnZXROZXh0TW92ZSA6IGZ1bmN0aW9uKGRpcmVjdGlvbil7XHJcblxyXG5cdFx0XHRzd2l0Y2goZGlyZWN0aW9uKXtcclxuXHRcdFx0XHRjYXNlICdsZWZ0JyA6IFxyXG5cdFx0XHRcdHRoaXMuY2VsbC54LT0xO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgJ3JpZ3RoJyA6IFxyXG5cdFx0XHRcdHRoaXMuY2VsbC54ICs9IDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAnYm90dG9tJyA6IFxyXG5cdFx0XHRcdHRoaXMuY2VsbC55ICs9IDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAndG9wJyA6IFxyXG5cdFx0XHRcdHRoaXMuY2VsbC55IC09IDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB0aGlzLmdldFNpbmdsZU1vdmUoKTtcclxuXHRcdFx0XHJcblx0XHR9LFxyXG5cdFx0Z2V0U2luZ2xlTW92ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHZhciBpbml0aWFsTm9kZSA9IHRoaXMuY2VsbHNbdGhpcy5jZWxsLnhdW3RoaXMuY2VsbC55XTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0eCA6IGluaXRpYWxOb2RlLngsXHJcblx0XHRcdFx0eSA6IGluaXRpYWxOb2RlLnksXHJcblx0XHRcdFx0d2lkdGggOiBpbml0aWFsTm9kZS53aWR0aCxcclxuXHRcdFx0XHRoZWlnaHQgOiBpbml0aWFsTm9kZS5oZWlnaHQsXHJcblx0XHRcdFx0d2FsbHMgOiB7XHJcblx0XHRcdFx0XHRyaWd0aCA6IGluaXRpYWxOb2RlLndhbGxzLnJpZ3RoLFxyXG5cdFx0XHRcdFx0bGVmdCA6IGluaXRpYWxOb2RlLndhbGxzLmxlZnQsXHJcblx0XHRcdFx0XHR0b3AgOiBpbml0aWFsTm9kZS53YWxscy50b3AsXHJcblx0XHRcdFx0XHRib3R0b20gOiBpbml0aWFsTm9kZS53YWxscy5ib3R0b21cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cdFx0cnVuIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0Ly90aGlzIG1ldGhvZCBjb3VsZCBiZSBvdmVycmlkZWQgYnkgdXNlclxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHJcblx0cmV0dXJuIFVzZXJJbnRlcmFjdGlvbjtcclxuXHJcbn0oKSk7IiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcblx0ZnVuY3Rpb24gV2FsbChwcm9wcyl7XHJcblx0XHR0aGlzLm5hbWUgPSBwcm9wcy5uYW1lO1xyXG5cdFx0dGhpcy5jb2xvciA9IHByb3BzLmNvbG9yIHx8IHRoaXMuY29sb3I7XHJcblx0XHR0aGlzLnggPSBwcm9wcy54O1xyXG5cdFx0dGhpcy55ID0gcHJvcHMueTtcclxuXHRcdHRoaXMud2lkdGggPSBwcm9wcy53aWR0aDtcclxuXHRcdHRoaXMuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xyXG5cdH1cclxuXHJcblx0V2FsbC5wcm90b3R5cGUgPSB7XHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0aGVpZ2h0IDogMCxcclxuXHRcdHdpZHRoIDogMCxcclxuXHRcdG5hbWUgOiBcIlwiLFxyXG5cdFx0Y29sb3IgOiBcImdyYXlcIixcclxuXHRcdGRyYXcgOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0dGhpc1t0aGlzLm5hbWVdKGNvbnRleHQpO1xyXG5cdFx0fSxcclxuXHRcdGxlZnQ6ZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8odGhpcy54ICogdGhpcy53aWR0aCwodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9LFxyXG5cdFx0cmlndGg6ZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbygodGhpcy54ICogdGhpcy53aWR0aCkgKyB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCArIDEpICogdGhpcy53aWR0aCwgKHRoaXMueSArIDEpICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZSgpO1xyXG5cdFx0fSxcclxuXHRcdHRvcCA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcclxuXHRcdFx0Y29udGV4dC5iZWdpblBhdGgoKTtcclxuXHRcdFx0Y29udGV4dC5tb3ZlVG8odGhpcy54ICogdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQubGluZVRvKCh0aGlzLnggKiB0aGlzLndpZHRoKSArIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZSgpO1x0XHJcblx0XHR9LFxyXG5cdFx0Ym90dG9tIDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLCh0aGlzLnkgKiB0aGlzLmhlaWdodCkgKyB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQubGluZVRvKCh0aGlzLnggKiB0aGlzLndpZHRoKSArIHRoaXMud2lkdGgsKHRoaXMueSArIDEpICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LnN0cm9rZSgpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBXYWxsO1xyXG5cclxufSgpKTsiXX0=
