(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"C:\\Maze-Engine\\client\\app\\app.js":[function(require,module,exports){
(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze"),
		UserInteraction = require("../app/core/user-interaction"),
		MouseEventListener = require("../app/core/mouse-event-listener"),
		interaction = null,
		mouseX = 0,
		mouseY = 0;

	function Main(){}

	Main.prototype = {
		editor : null,
		maze : null,
		canvas : null,
		context : null,
		init : function(){
			this.getInitialSize();
			this.initEditor();
			this.canvas = document.querySelector(".main-canvas");
			this.context = this.canvas.getContext("2d");

			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;

			this.fetchMazeAndDraw().then(function(){
				this.update();
			}.bind(this));

			this.bindEvents();
		},
		getInitialSize : function(){
			Config.WIDTH = Math.floor(10 + (Math.random() * 20));
			Config.HEIGHT = Config.WIDTH;
		},
		update : function(){
			this.draw();
			requestAnimationFrame(this.update.bind(this));
		},
		fetchMazeAndDraw:function(){
			return this.fetchMaze().then(function(cells){
				this.maze = new Maze({
					width : Config.WIDTH,
					height : Config.HEIGHT,
					cells : cells
				});
				interaction = new UserInteraction({
					end : this.maze.getEndNode(),
					cell : cells[0][0]
				});
			}.bind(this));
		},
		bindEvents : function(){
			var btnDrawSolution = document.getElementById("input-draw-solution"),
				btnNewMaze = document.getElementById("input-new-maze");
			
			btnDrawSolution.addEventListener("click",this.handleClickDrawSolution.bind(this),false);
			btnNewMaze.addEventListener("click",this.handleClickNewMaze.bind(this),false);

			this.editor.on("change", function(){
				var code = this.editor.getSession().getValue();
				localStorage.setItem("code",code);
			}.bind(this));
		},
		handleClickNewMaze : function(){
			this.getInitialSize();
			this.canvas.width = Config.WIDTH * Config.CELL_SIZE;
			this.canvas.height = Config.HEIGHT * Config.CELL_SIZE;
			this.maze.width = Config.width;
			this.maze.height = Config.height;
			this.fetchMazeAndDraw();
		},
		handleClickDrawSolution : function(){
			var codeSolution = this.editor.getSession().getValue();
			var run = eval(codeSolution);
			
			this.initInteraction();	
			interaction.execute(run.bind(interaction));
		},
		initEditor : function(){
			var code = localStorage.getItem("code");

			this.editor = ace.edit("editor");
		    this.editor.setTheme("ace/theme/monokai");
		    this.editor.getSession().setMode("ace/mode/javascript");

		    if(code){
				this.editor.getSession().setValue(code, 1);
			}
		},
		initInteraction : function(){
			var initialNode = this.maze.cells[0][0];
			interaction.init({
				end : this.maze.getEndNode(),
				cells : this.maze.cells,
				cell : {
					x : initialNode.x,
					y : initialNode.y,
					width : initialNode.width,
					height : initialNode.height,
					walls : {
						right : initialNode.walls.right,
						left : initialNode.walls.left,
						top : initialNode.walls.top,
						bottom : initialNode.walls.bottom
					}
				}
			});
		},
		draw : function(){
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
			this.maze.draw(this.context);
			var toPaint = interaction.getToPaint();
			if(toPaint.length > 0){
				var index = toPaint.length - 2;
				var currentNode = index < 0 ? this.maze.cells[0][0] : toPaint[index];
				var nextNode = toPaint[toPaint.length - 1];
				if(!this.maze.isInvalidMove(currentNode,nextNode)){
					this.maze.fillCell(this.context,nextNode, "blue");
				}else {
					this.initInteraction();
				}
			}else{
				this.maze.fillCell(this.context,this.maze.cells[0][0], "blue");
			}
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
},{"../app/core/config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","../app/core/maze":"C:\\Maze-Engine\\client\\app\\core\\maze.js","../app/core/mouse-event-listener":"C:\\Maze-Engine\\client\\app\\core\\mouse-event-listener.js","../app/core/user-interaction":"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js"}],"C:\\Maze-Engine\\client\\app\\core\\cell.js":[function(require,module,exports){
module.exports = (function(){

	var Wall = require("./wall"),
		Config = require("./config-maze");

	function Cell(rawCell){
		this.walls = {
			left : null,
			right : null,
			top : null,
			bottom : null
		};
		this.init(rawCell);
	}

	Cell.prototype = {
		names : ["left","right","top","bottom"],
		x : 0,
		y : 0,
		width : Config.CELL_SIZE,
		height : Config.CELL_SIZE,
		visited : false,
		walls : {
			left : null,
			right : null,
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
},{"./config-maze":"C:\\Maze-Engine\\client\\app\\core\\config-maze.js","./wall":"C:\\Maze-Engine\\client\\app\\core\\wall.js"}],"C:\\Maze-Engine\\client\\app\\core\\config-maze.js":[function(require,module,exports){
module.exports = {
	CELL_SIZE : 20,
	WIDTH :20,
	HEIGHT : 20
};
},{}],"C:\\Maze-Engine\\client\\app\\core\\maze.js":[function(require,module,exports){
module.exports = (function(){

	var Cell = require("./cell");
	var end = null;

	function Maze(props){
		this.init(props);
	}

	Maze.prototype = {
		width : 0,
		height : 0,
		cells : [],
		getEndNode : function(){
			return end;
		},
		init : function(props){
			this.width = props.width;
			this.height = props.height;
			this.createCells(props.cells);
			end = this.getRandomPosition();
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
			this.fillCell(context,this.cells[end.x][end.y], "red");
			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		isInvalidMove : function(currentNode,nextNode){

        	if(nextNode.x > currentNode.x && currentNode.walls.right){
        		return true;
        	}

        	if(nextNode.y < currentNode.y && currentNode.walls.top){
        		return true;
        	}

        	if(nextNode.y > currentNode.y && currentNode.walls.bottom){
        		return true;
        	}

        	if(nextNode.x < currentNode.x && currentNode.walls.left){
        		return true;
        	}
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
		},
		getRandomPosition:function(){
			return {
				x : Math.floor(Math.random() * this.width),
        		y : Math.floor(Math.random() * this.height)
			}
		}
	};

	return Maze;

}());
},{"./cell":"C:\\Maze-Engine\\client\\app\\core\\cell.js"}],"C:\\Maze-Engine\\client\\app\\core\\mouse-event-listener.js":[function(require,module,exports){
module.exports=(function(){

	var onMouseMoveCallBack;

	function MouseEventListener(props){
		this.init(props);
	}

	function getMousePos(element, evt) {
        var rect = element.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      }

	MouseEventListener.prototype = {
			element : null,
		    init : function(props){
		    	this.element = props.element;
		    	onMouseMoveCallBack = props.onMouseMove || function(){};
		        this.bindEvents();
		    },
		    bindEvents : function(){
		        this.element.addEventListener('mousemove',function(e){
		        	this.onMouseMove(e,this.element);
		        }.bind(this),false);
		    },
		    onMouseMove : function(e,element){
				var position = getMousePos(element,e);
				onMouseMoveCallBack(position.x,position.y);
			}
	};
    

	return MouseEventListener;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\user-interaction.js":[function(require,module,exports){
module.exports = (function(){

	var cells = [],
		end = null, 
		cell = null, 
		moves = [],
		toBePaint = [],
		movePromises = [],
		context,
		fps = 1000 / 5;

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		x : 0,
		y : 0,
		getMoves : function(){
			return moves;
		},
		getToPaint : function(){
			return toBePaint;
		},
		init : function(props){
			cell = props.cell;
			end = props.end;
			cells = props.cells;
			moves = [];
			toBePaint = [];
			movePromises.forEach(function(promise){
				clearTimeout(promise);
			});
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			return cell.x === end.x && cell.y === end.y;
		},
		moveTo : function(direction){
			var nextMove = this.getNextMove(direction);
			moves.push(nextMove);
			movePromises.push(setTimeout(function(){
				toBePaint.push(nextMove);
			}.bind(this), moves.length * fps));
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = moves[moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				cell.x-=1;
				break;
				case 'right' : 
				cell.x += 1;
				break;
				case 'bottom' : 
				cell.y += 1;
				break;
				case 'top' : 
				cell.y -= 1;
				break;
			}

			var result = this.getSingleMove();

			this.x = result.x;
			this.y = result.y;

			return result;
			
		},
		getSingleMove : function(){
			var initialNode = cells[cell.x][cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					right : initialNode.walls.right,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		execute : function(runFunction){
			if(runFunction && typeof runFunction === "function"){
				runFunction();
				console.log(moves.length);
			}
		},
	};


	return UserInteraction;

}());
},{}],"C:\\Maze-Engine\\client\\app\\core\\wall.js":[function(require,module,exports){
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
		right:function(context){
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
},{}]},{},["C:\\Maze-Engine\\client\\app\\app.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvYXBwL2FwcC5qcyIsImNsaWVudC9hcHAvY29yZS9jZWxsLmpzIiwiY2xpZW50L2FwcC9jb3JlL2NvbmZpZy1tYXplLmpzIiwiY2xpZW50L2FwcC9jb3JlL21hemUuanMiLCJjbGllbnQvYXBwL2NvcmUvbW91c2UtZXZlbnQtbGlzdGVuZXIuanMiLCJjbGllbnQvYXBwL2NvcmUvdXNlci1pbnRlcmFjdGlvbi5qcyIsImNsaWVudC9hcHAvY29yZS93YWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oKXtcclxuXHJcblx0XCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5cdHZhciBtYWluID0gbnVsbCxcclxuXHRcdE1hemUgPSByZXF1aXJlKFwiLi4vYXBwL2NvcmUvbWF6ZVwiKSxcclxuXHRcdENvbmZpZyA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS9jb25maWctbWF6ZVwiKSxcclxuXHRcdFVzZXJJbnRlcmFjdGlvbiA9IHJlcXVpcmUoXCIuLi9hcHAvY29yZS91c2VyLWludGVyYWN0aW9uXCIpLFxyXG5cdFx0TW91c2VFdmVudExpc3RlbmVyID0gcmVxdWlyZShcIi4uL2FwcC9jb3JlL21vdXNlLWV2ZW50LWxpc3RlbmVyXCIpLFxyXG5cdFx0aW50ZXJhY3Rpb24gPSBudWxsLFxyXG5cdFx0bW91c2VYID0gMCxcclxuXHRcdG1vdXNlWSA9IDA7XHJcblxyXG5cdGZ1bmN0aW9uIE1haW4oKXt9XHJcblxyXG5cdE1haW4ucHJvdG90eXBlID0ge1xyXG5cdFx0ZWRpdG9yIDogbnVsbCxcclxuXHRcdG1hemUgOiBudWxsLFxyXG5cdFx0Y2FudmFzIDogbnVsbCxcclxuXHRcdGNvbnRleHQgOiBudWxsLFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuZ2V0SW5pdGlhbFNpemUoKTtcclxuXHRcdFx0dGhpcy5pbml0RWRpdG9yKCk7XHJcblx0XHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tYWluLWNhbnZhc1wiKTtcclxuXHRcdFx0dGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuXHRcdFx0dGhpcy5jYW52YXMud2lkdGggPSBDb25maWcuV0lEVEggKiBDb25maWcuQ0VMTF9TSVpFO1xyXG5cdFx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSBDb25maWcuSEVJR0hUICogQ29uZmlnLkNFTExfU0laRTtcclxuXHJcblx0XHRcdHRoaXMuZmV0Y2hNYXplQW5kRHJhdygpLnRoZW4oZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdFx0XHR9LmJpbmQodGhpcykpO1xyXG5cclxuXHRcdFx0dGhpcy5iaW5kRXZlbnRzKCk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0SW5pdGlhbFNpemUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRDb25maWcuV0lEVEggPSBNYXRoLmZsb29yKDEwICsgKE1hdGgucmFuZG9tKCkgKiAyMCkpO1xyXG5cdFx0XHRDb25maWcuSEVJR0hUID0gQ29uZmlnLldJRFRIO1xyXG5cdFx0fSxcclxuXHRcdHVwZGF0ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuZHJhdygpO1xyXG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XHJcblx0XHR9LFxyXG5cdFx0ZmV0Y2hNYXplQW5kRHJhdzpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5mZXRjaE1hemUoKS50aGVuKGZ1bmN0aW9uKGNlbGxzKXtcclxuXHRcdFx0XHR0aGlzLm1hemUgPSBuZXcgTWF6ZSh7XHJcblx0XHRcdFx0XHR3aWR0aCA6IENvbmZpZy5XSURUSCxcclxuXHRcdFx0XHRcdGhlaWdodCA6IENvbmZpZy5IRUlHSFQsXHJcblx0XHRcdFx0XHRjZWxscyA6IGNlbGxzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0aW50ZXJhY3Rpb24gPSBuZXcgVXNlckludGVyYWN0aW9uKHtcclxuXHRcdFx0XHRcdGVuZCA6IHRoaXMubWF6ZS5nZXRFbmROb2RlKCksXHJcblx0XHRcdFx0XHRjZWxsIDogY2VsbHNbMF1bMF1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpKTtcclxuXHRcdH0sXHJcblx0XHRiaW5kRXZlbnRzIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGJ0bkRyYXdTb2x1dGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXQtZHJhdy1zb2x1dGlvblwiKSxcclxuXHRcdFx0XHRidG5OZXdNYXplID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dC1uZXctbWF6ZVwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGJ0bkRyYXdTb2x1dGlvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIix0aGlzLmhhbmRsZUNsaWNrRHJhd1NvbHV0aW9uLmJpbmQodGhpcyksZmFsc2UpO1xyXG5cdFx0XHRidG5OZXdNYXplLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLHRoaXMuaGFuZGxlQ2xpY2tOZXdNYXplLmJpbmQodGhpcyksZmFsc2UpO1xyXG5cclxuXHRcdFx0dGhpcy5lZGl0b3Iub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgY29kZSA9IHRoaXMuZWRpdG9yLmdldFNlc3Npb24oKS5nZXRWYWx1ZSgpO1xyXG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiY29kZVwiLGNvZGUpO1xyXG5cdFx0XHR9LmJpbmQodGhpcykpO1xyXG5cdFx0fSxcclxuXHRcdGhhbmRsZUNsaWNrTmV3TWF6ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuZ2V0SW5pdGlhbFNpemUoKTtcclxuXHRcdFx0dGhpcy5jYW52YXMud2lkdGggPSBDb25maWcuV0lEVEggKiBDb25maWcuQ0VMTF9TSVpFO1xyXG5cdFx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSBDb25maWcuSEVJR0hUICogQ29uZmlnLkNFTExfU0laRTtcclxuXHRcdFx0dGhpcy5tYXplLndpZHRoID0gQ29uZmlnLndpZHRoO1xyXG5cdFx0XHR0aGlzLm1hemUuaGVpZ2h0ID0gQ29uZmlnLmhlaWdodDtcclxuXHRcdFx0dGhpcy5mZXRjaE1hemVBbmREcmF3KCk7XHJcblx0XHR9LFxyXG5cdFx0aGFuZGxlQ2xpY2tEcmF3U29sdXRpb24gOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgY29kZVNvbHV0aW9uID0gdGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLmdldFZhbHVlKCk7XHJcblx0XHRcdHZhciBydW4gPSBldmFsKGNvZGVTb2x1dGlvbik7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLmluaXRJbnRlcmFjdGlvbigpO1x0XHJcblx0XHRcdGludGVyYWN0aW9uLmV4ZWN1dGUocnVuLmJpbmQoaW50ZXJhY3Rpb24pKTtcclxuXHRcdH0sXHJcblx0XHRpbml0RWRpdG9yIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGNvZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvZGVcIik7XHJcblxyXG5cdFx0XHR0aGlzLmVkaXRvciA9IGFjZS5lZGl0KFwiZWRpdG9yXCIpO1xyXG5cdFx0ICAgIHRoaXMuZWRpdG9yLnNldFRoZW1lKFwiYWNlL3RoZW1lL21vbm9rYWlcIik7XHJcblx0XHQgICAgdGhpcy5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIpO1xyXG5cclxuXHRcdCAgICBpZihjb2RlKXtcclxuXHRcdFx0XHR0aGlzLmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZSwgMSk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRpbml0SW50ZXJhY3Rpb24gOiBmdW5jdGlvbigpe1xyXG5cdFx0XHR2YXIgaW5pdGlhbE5vZGUgPSB0aGlzLm1hemUuY2VsbHNbMF1bMF07XHJcblx0XHRcdGludGVyYWN0aW9uLmluaXQoe1xyXG5cdFx0XHRcdGVuZCA6IHRoaXMubWF6ZS5nZXRFbmROb2RlKCksXHJcblx0XHRcdFx0Y2VsbHMgOiB0aGlzLm1hemUuY2VsbHMsXHJcblx0XHRcdFx0Y2VsbCA6IHtcclxuXHRcdFx0XHRcdHggOiBpbml0aWFsTm9kZS54LFxyXG5cdFx0XHRcdFx0eSA6IGluaXRpYWxOb2RlLnksXHJcblx0XHRcdFx0XHR3aWR0aCA6IGluaXRpYWxOb2RlLndpZHRoLFxyXG5cdFx0XHRcdFx0aGVpZ2h0IDogaW5pdGlhbE5vZGUuaGVpZ2h0LFxyXG5cdFx0XHRcdFx0d2FsbHMgOiB7XHJcblx0XHRcdFx0XHRcdHJpZ2h0IDogaW5pdGlhbE5vZGUud2FsbHMucmlnaHQsXHJcblx0XHRcdFx0XHRcdGxlZnQgOiBpbml0aWFsTm9kZS53YWxscy5sZWZ0LFxyXG5cdFx0XHRcdFx0XHR0b3AgOiBpbml0aWFsTm9kZS53YWxscy50b3AsXHJcblx0XHRcdFx0XHRcdGJvdHRvbSA6IGluaXRpYWxOb2RlLndhbGxzLmJvdHRvbVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwwLHRoaXMuY2FudmFzLndpZHRoLHRoaXMuY2FudmFzLmhlaWdodCk7XHJcblx0XHRcdHRoaXMubWF6ZS5kcmF3KHRoaXMuY29udGV4dCk7XHJcblx0XHRcdHZhciB0b1BhaW50ID0gaW50ZXJhY3Rpb24uZ2V0VG9QYWludCgpO1xyXG5cdFx0XHRpZih0b1BhaW50Lmxlbmd0aCA+IDApe1xyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRvUGFpbnQubGVuZ3RoIC0gMjtcclxuXHRcdFx0XHR2YXIgY3VycmVudE5vZGUgPSBpbmRleCA8IDAgPyB0aGlzLm1hemUuY2VsbHNbMF1bMF0gOiB0b1BhaW50W2luZGV4XTtcclxuXHRcdFx0XHR2YXIgbmV4dE5vZGUgPSB0b1BhaW50W3RvUGFpbnQubGVuZ3RoIC0gMV07XHJcblx0XHRcdFx0aWYoIXRoaXMubWF6ZS5pc0ludmFsaWRNb3ZlKGN1cnJlbnROb2RlLG5leHROb2RlKSl7XHJcblx0XHRcdFx0XHR0aGlzLm1hemUuZmlsbENlbGwodGhpcy5jb250ZXh0LG5leHROb2RlLCBcImJsdWVcIik7XHJcblx0XHRcdFx0fWVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5pbml0SW50ZXJhY3Rpb24oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1lbHNle1xyXG5cdFx0XHRcdHRoaXMubWF6ZS5maWxsQ2VsbCh0aGlzLmNvbnRleHQsdGhpcy5tYXplLmNlbGxzWzBdWzBdLCBcImJsdWVcIik7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRmZXRjaE1hemUgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZmV0Y2goXCIvYXBpL3YxL21hemU/d2lkdGg9XCIrQ29uZmlnLldJRFRIK1wiJmhlaWdodD1cIitDb25maWcuSEVJR0hULHtcclxuXHRcdFx0XHRtZXRob2Q6ICdHRVQnLCBcclxuXHRcdFx0XHRoZWFkZXJzOiBuZXcgSGVhZGVycyh7XHJcblx0XHRcdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0fSkudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9LFxyXG5cdFx0ZmV0Y2hNYXplU29sdXRpb24gOiBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0cmV0dXJuIGZldGNoKFwiL2FwaS92MS9tYXplL3NvbHV0aW9uXCIse1xyXG5cdFx0XHRcdG1ldGhvZDogJ1BPU1QnLCBcclxuXHRcdFx0XHRib2R5IDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXHJcblx0XHRcdFx0aGVhZGVyczogbmV3IEhlYWRlcnMoe1xyXG5cdFx0XHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5qc29uKCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHRtYWluID0gbmV3IE1haW4oKTtcclxuXHJcblx0d2luZG93Lm9ubG9hZCA9IG1haW4uaW5pdC5iaW5kKG1haW4pO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHR2YXIgV2FsbCA9IHJlcXVpcmUoXCIuL3dhbGxcIiksXHJcblx0XHRDb25maWcgPSByZXF1aXJlKFwiLi9jb25maWctbWF6ZVwiKTtcclxuXHJcblx0ZnVuY3Rpb24gQ2VsbChyYXdDZWxsKXtcclxuXHRcdHRoaXMud2FsbHMgPSB7XHJcblx0XHRcdGxlZnQgOiBudWxsLFxyXG5cdFx0XHRyaWdodCA6IG51bGwsXHJcblx0XHRcdHRvcCA6IG51bGwsXHJcblx0XHRcdGJvdHRvbSA6IG51bGxcclxuXHRcdH07XHJcblx0XHR0aGlzLmluaXQocmF3Q2VsbCk7XHJcblx0fVxyXG5cclxuXHRDZWxsLnByb3RvdHlwZSA9IHtcclxuXHRcdG5hbWVzIDogW1wibGVmdFwiLFwicmlnaHRcIixcInRvcFwiLFwiYm90dG9tXCJdLFxyXG5cdFx0eCA6IDAsXHJcblx0XHR5IDogMCxcclxuXHRcdHdpZHRoIDogQ29uZmlnLkNFTExfU0laRSxcclxuXHRcdGhlaWdodCA6IENvbmZpZy5DRUxMX1NJWkUsXHJcblx0XHR2aXNpdGVkIDogZmFsc2UsXHJcblx0XHR3YWxscyA6IHtcclxuXHRcdFx0bGVmdCA6IG51bGwsXHJcblx0XHRcdHJpZ2h0IDogbnVsbCxcclxuXHRcdFx0dG9wIDogbnVsbCxcclxuXHRcdFx0Ym90dG9tIDogbnVsbFxyXG5cdFx0fSxcclxuXHRcdGluaXQgOiBmdW5jdGlvbihwcm9wcyl7XHJcblx0XHRcdHRoaXMueCA9IHByb3BzLng7XHJcblx0XHRcdHRoaXMueSA9IHByb3BzLnk7XHJcblx0XHRcdHRoaXMud2lkdGggPSBwcm9wcy53aWR0aDtcclxuXHRcdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcblx0XHRcdHRoaXMuY3JlYXRlV2FsbHMocHJvcHMud2FsbHMpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZVdhbGxzIDogZnVuY3Rpb24ocHJvcHMpe1xyXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XHJcblx0XHRcdGZvcih2YXIgcCBpbiBwcm9wcyl7XHJcblx0XHRcdFx0dmFyIG9iaiA9IHByb3BzW3BdO1xyXG5cdFx0XHRcdGlmKCFvYmope1xyXG5cdFx0XHRcdFx0dGhpcy53YWxsc1twXSA9IG51bGw7XHJcblx0XHRcdFx0fWVsc2V7XHJcblx0XHRcdFx0XHR0aGlzLndhbGxzW3BdID0gbmV3IFdhbGwoe1xyXG5cdFx0XHRcdFx0XHRuYW1lIDogcCxcclxuXHRcdFx0XHRcdFx0eCA6IG9iai54LFxyXG5cdFx0XHRcdFx0XHR5IDogb2JqLnksXHJcblx0XHRcdFx0XHRcdGhlaWdodCA6IG9iai5oZWlnaHQsXHJcblx0XHRcdFx0XHRcdHdpZHRoIDogb2JqLndpZHRoXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMubmFtZXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKXtcclxuXHRcdFx0XHR2YXIgd2FsbCA9IHRoaXMud2FsbHNbbmFtZV07XHJcblx0XHRcdFx0aWYod2FsbCl7XHJcblx0XHRcdFx0XHR3YWxsLmRyYXcoY29udGV4dCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LHRoaXMpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHJldHVybiBDZWxsO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRDRUxMX1NJWkUgOiAyMCxcclxuXHRXSURUSCA6MjAsXHJcblx0SEVJR0hUIDogMjBcclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHR2YXIgQ2VsbCA9IHJlcXVpcmUoXCIuL2NlbGxcIik7XHJcblx0dmFyIGVuZCA9IG51bGw7XHJcblxyXG5cdGZ1bmN0aW9uIE1hemUocHJvcHMpe1xyXG5cdFx0dGhpcy5pbml0KHByb3BzKTtcclxuXHR9XHJcblxyXG5cdE1hemUucHJvdG90eXBlID0ge1xyXG5cdFx0d2lkdGggOiAwLFxyXG5cdFx0aGVpZ2h0IDogMCxcclxuXHRcdGNlbGxzIDogW10sXHJcblx0XHRnZXRFbmROb2RlIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0cmV0dXJuIGVuZDtcclxuXHRcdH0sXHJcblx0XHRpbml0IDogZnVuY3Rpb24ocHJvcHMpe1xyXG5cdFx0XHR0aGlzLndpZHRoID0gcHJvcHMud2lkdGg7XHJcblx0XHRcdHRoaXMuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xyXG5cdFx0XHR0aGlzLmNyZWF0ZUNlbGxzKHByb3BzLmNlbGxzKTtcclxuXHRcdFx0ZW5kID0gdGhpcy5nZXRSYW5kb21Qb3NpdGlvbigpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZUNlbGxzIDogZnVuY3Rpb24ocmF3Q2VsbHMpe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJhd0NlbGxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHQgICAgICAgIHRoaXMuY2VsbHNbaV0gPSBbXTtcclxuXHRcdCAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByYXdDZWxsc1tpXS5sZW5ndGg7IGorKykge1xyXG5cdFx0ICAgICAgICAgICAgdGhpcy5jZWxsc1tpXVtqXSA9IG5ldyBDZWxsKHJhd0NlbGxzW2ldW2pdKTtcclxuXHRcdCAgICAgICAgfVxyXG5cdFx0ICAgIH1cclxuXHRcdH0sXHJcblx0XHRkcmF3IDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdHRoaXMuZmlsbENlbGwoY29udGV4dCx0aGlzLmNlbGxzW2VuZC54XVtlbmQueV0sIFwicmVkXCIpO1xyXG5cdFx0XHR0aGlzLmNlbGxzLmZvckVhY2goZnVuY3Rpb24gKHJvd3MpIHtcclxuXHRcdFx0XHRyb3dzLmZvckVhY2goZnVuY3Rpb24oY2VsbCl7XHJcblx0XHRcdFx0XHRjZWxsLmRyYXcoY29udGV4dCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdGlzSW52YWxpZE1vdmUgOiBmdW5jdGlvbihjdXJyZW50Tm9kZSxuZXh0Tm9kZSl7XHJcblxyXG4gICAgICAgIFx0aWYobmV4dE5vZGUueCA+IGN1cnJlbnROb2RlLnggJiYgY3VycmVudE5vZGUud2FsbHMucmlnaHQpe1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS55IDwgY3VycmVudE5vZGUueSAmJiBjdXJyZW50Tm9kZS53YWxscy50b3Ape1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS55ID4gY3VycmVudE5vZGUueSAmJiBjdXJyZW50Tm9kZS53YWxscy5ib3R0b20pe1xyXG4gICAgICAgIFx0XHRyZXR1cm4gdHJ1ZTtcclxuICAgICAgICBcdH1cclxuXHJcbiAgICAgICAgXHRpZihuZXh0Tm9kZS54IDwgY3VycmVudE5vZGUueCAmJiBjdXJyZW50Tm9kZS53YWxscy5sZWZ0KXtcclxuICAgICAgICBcdFx0cmV0dXJuIHRydWU7XHJcbiAgICAgICAgXHR9XHJcblx0XHR9LFxyXG5cdFx0ZmlsbENlbGwgOiBmdW5jdGlvbihjb250ZXh0LGNlbGwsY29sb3Ipe1xyXG5cdFx0XHRjb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG5cdFx0XHR2YXIgeCA9IChjZWxsLnggKiBjZWxsLndpZHRoKSArIDU7XHJcblx0XHRcdHZhciB5ID0gKGNlbGwueSAqIGNlbGwuaGVpZ2h0KSArIDU7XHJcblx0XHRcdGNvbnRleHQuZmlsbFJlY3QoeCx5LGNlbGwud2lkdGggLyAyLGNlbGwuaGVpZ2h0IC8gMik7XHJcblx0XHR9LFxyXG5cdFx0Y2xlYXJDZWxsIDogZnVuY3Rpb24oY29udGV4dCxjZWxsKXtcclxuXHRcdFx0dmFyIHggPSAoY2VsbC54ICogY2VsbC53aWR0aCkgKyA1O1xyXG5cdFx0XHR2YXIgeSA9IChjZWxsLnkgKiBjZWxsLmhlaWdodCkgKyA1O1xyXG5cdFx0XHRjb250ZXh0LmNsZWFyUmVjdCh4LHksY2VsbC53aWR0aCAvIDIsY2VsbC5oZWlnaHQgLyAyKTtcclxuXHRcdH0sXHJcblx0XHRnZXRSYW5kb21Qb3NpdGlvbjpmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHggOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB0aGlzLndpZHRoKSxcclxuICAgICAgICBcdFx0eSA6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuaGVpZ2h0KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIE1hemU7XHJcblxyXG59KCkpOyIsIm1vZHVsZS5leHBvcnRzPShmdW5jdGlvbigpe1xyXG5cclxuXHR2YXIgb25Nb3VzZU1vdmVDYWxsQmFjaztcclxuXHJcblx0ZnVuY3Rpb24gTW91c2VFdmVudExpc3RlbmVyKHByb3BzKXtcclxuXHRcdHRoaXMuaW5pdChwcm9wcyk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRNb3VzZVBvcyhlbGVtZW50LCBldnQpIHtcclxuICAgICAgICB2YXIgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHg6IGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LFxyXG4gICAgICAgICAgeTogZXZ0LmNsaWVudFkgLSByZWN0LnRvcFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcblx0TW91c2VFdmVudExpc3RlbmVyLnByb3RvdHlwZSA9IHtcclxuXHRcdFx0ZWxlbWVudCA6IG51bGwsXHJcblx0XHQgICAgaW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdCAgICBcdHRoaXMuZWxlbWVudCA9IHByb3BzLmVsZW1lbnQ7XHJcblx0XHQgICAgXHRvbk1vdXNlTW92ZUNhbGxCYWNrID0gcHJvcHMub25Nb3VzZU1vdmUgfHwgZnVuY3Rpb24oKXt9O1xyXG5cdFx0ICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcclxuXHRcdCAgICB9LFxyXG5cdFx0ICAgIGJpbmRFdmVudHMgOiBmdW5jdGlvbigpe1xyXG5cdFx0ICAgICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJyxmdW5jdGlvbihlKXtcclxuXHRcdCAgICAgICAgXHR0aGlzLm9uTW91c2VNb3ZlKGUsdGhpcy5lbGVtZW50KTtcclxuXHRcdCAgICAgICAgfS5iaW5kKHRoaXMpLGZhbHNlKTtcclxuXHRcdCAgICB9LFxyXG5cdFx0ICAgIG9uTW91c2VNb3ZlIDogZnVuY3Rpb24oZSxlbGVtZW50KXtcclxuXHRcdFx0XHR2YXIgcG9zaXRpb24gPSBnZXRNb3VzZVBvcyhlbGVtZW50LGUpO1xyXG5cdFx0XHRcdG9uTW91c2VNb3ZlQ2FsbEJhY2socG9zaXRpb24ueCxwb3NpdGlvbi55KTtcclxuXHRcdFx0fVxyXG5cdH07XHJcbiAgICBcclxuXHJcblx0cmV0dXJuIE1vdXNlRXZlbnRMaXN0ZW5lcjtcclxuXHJcbn0oKSk7IiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKXtcclxuXHJcblx0dmFyIGNlbGxzID0gW10sXHJcblx0XHRlbmQgPSBudWxsLCBcclxuXHRcdGNlbGwgPSBudWxsLCBcclxuXHRcdG1vdmVzID0gW10sXHJcblx0XHR0b0JlUGFpbnQgPSBbXSxcclxuXHRcdG1vdmVQcm9taXNlcyA9IFtdLFxyXG5cdFx0Y29udGV4dCxcclxuXHRcdGZwcyA9IDEwMDAgLyA1O1xyXG5cclxuXHRmdW5jdGlvbiBVc2VySW50ZXJhY3Rpb24ocHJvcHMpe1xyXG5cdFx0dGhpcy5pbml0KHByb3BzKTtcclxuXHR9XHJcblxyXG5cdFVzZXJJbnRlcmFjdGlvbi5wcm90b3R5cGUgPSB7XHJcblx0XHR4IDogMCxcclxuXHRcdHkgOiAwLFxyXG5cdFx0Z2V0TW92ZXMgOiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gbW92ZXM7XHJcblx0XHR9LFxyXG5cdFx0Z2V0VG9QYWludCA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiB0b0JlUGFpbnQ7XHJcblx0XHR9LFxyXG5cdFx0aW5pdCA6IGZ1bmN0aW9uKHByb3BzKXtcclxuXHRcdFx0Y2VsbCA9IHByb3BzLmNlbGw7XHJcblx0XHRcdGVuZCA9IHByb3BzLmVuZDtcclxuXHRcdFx0Y2VsbHMgPSBwcm9wcy5jZWxscztcclxuXHRcdFx0bW92ZXMgPSBbXTtcclxuXHRcdFx0dG9CZVBhaW50ID0gW107XHJcblx0XHRcdG1vdmVQcm9taXNlcy5mb3JFYWNoKGZ1bmN0aW9uKHByb21pc2Upe1xyXG5cdFx0XHRcdGNsZWFyVGltZW91dChwcm9taXNlKTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMueCA9IDA7XHJcblx0XHRcdHRoaXMueSA9IDA7XHJcblx0XHR9LFxyXG5cdFx0aXNDb21wbGV0ZSA6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBjZWxsLnggPT09IGVuZC54ICYmIGNlbGwueSA9PT0gZW5kLnk7XHJcblx0XHR9LFxyXG5cdFx0bW92ZVRvIDogZnVuY3Rpb24oZGlyZWN0aW9uKXtcclxuXHRcdFx0dmFyIG5leHRNb3ZlID0gdGhpcy5nZXROZXh0TW92ZShkaXJlY3Rpb24pO1xyXG5cdFx0XHRtb3Zlcy5wdXNoKG5leHRNb3ZlKTtcclxuXHRcdFx0bW92ZVByb21pc2VzLnB1c2goc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG5cdFx0XHRcdHRvQmVQYWludC5wdXNoKG5leHRNb3ZlKTtcclxuXHRcdFx0fS5iaW5kKHRoaXMpLCBtb3Zlcy5sZW5ndGggKiBmcHMpKTtcclxuXHRcdFx0cmV0dXJuIG5leHRNb3ZlO1xyXG5cdFx0fSxcclxuXHRcdGNhbk1vdmVUbyA6IGZ1bmN0aW9uKGRpcmVjdGlvbil7XHJcblx0XHRcdHZhciBsYXN0TW92ZSA9IG1vdmVzW21vdmVzLmxlbmd0aCAtIDFdIHx8IHRoaXMuZ2V0U2luZ2xlTW92ZSgpO1xyXG5cdFx0XHRyZXR1cm4gbGFzdE1vdmUud2FsbHNbZGlyZWN0aW9uXSA9PT0gbnVsbDtcclxuXHRcdH0sXHJcblx0XHRnZXROZXh0TW92ZSA6IGZ1bmN0aW9uKGRpcmVjdGlvbil7XHJcblxyXG5cdFx0XHRzd2l0Y2goZGlyZWN0aW9uKXtcclxuXHRcdFx0XHRjYXNlICdsZWZ0JyA6IFxyXG5cdFx0XHRcdGNlbGwueC09MTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdyaWdodCcgOiBcclxuXHRcdFx0XHRjZWxsLnggKz0gMTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlICdib3R0b20nIDogXHJcblx0XHRcdFx0Y2VsbC55ICs9IDE7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSAndG9wJyA6IFxyXG5cdFx0XHRcdGNlbGwueSAtPSAxO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgcmVzdWx0ID0gdGhpcy5nZXRTaW5nbGVNb3ZlKCk7XHJcblxyXG5cdFx0XHR0aGlzLnggPSByZXN1bHQueDtcclxuXHRcdFx0dGhpcy55ID0gcmVzdWx0Lnk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHRcclxuXHRcdH0sXHJcblx0XHRnZXRTaW5nbGVNb3ZlIDogZnVuY3Rpb24oKXtcclxuXHRcdFx0dmFyIGluaXRpYWxOb2RlID0gY2VsbHNbY2VsbC54XVtjZWxsLnldO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR4IDogaW5pdGlhbE5vZGUueCxcclxuXHRcdFx0XHR5IDogaW5pdGlhbE5vZGUueSxcclxuXHRcdFx0XHR3aWR0aCA6IGluaXRpYWxOb2RlLndpZHRoLFxyXG5cdFx0XHRcdGhlaWdodCA6IGluaXRpYWxOb2RlLmhlaWdodCxcclxuXHRcdFx0XHR3YWxscyA6IHtcclxuXHRcdFx0XHRcdHJpZ2h0IDogaW5pdGlhbE5vZGUud2FsbHMucmlnaHQsXHJcblx0XHRcdFx0XHRsZWZ0IDogaW5pdGlhbE5vZGUud2FsbHMubGVmdCxcclxuXHRcdFx0XHRcdHRvcCA6IGluaXRpYWxOb2RlLndhbGxzLnRvcCxcclxuXHRcdFx0XHRcdGJvdHRvbSA6IGluaXRpYWxOb2RlLndhbGxzLmJvdHRvbVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRleGVjdXRlIDogZnVuY3Rpb24ocnVuRnVuY3Rpb24pe1xyXG5cdFx0XHRpZihydW5GdW5jdGlvbiAmJiB0eXBlb2YgcnVuRnVuY3Rpb24gPT09IFwiZnVuY3Rpb25cIil7XHJcblx0XHRcdFx0cnVuRnVuY3Rpb24oKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhtb3Zlcy5sZW5ndGgpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cclxuXHRyZXR1cm4gVXNlckludGVyYWN0aW9uO1xyXG5cclxufSgpKTsiLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpe1xyXG5cclxuXHRmdW5jdGlvbiBXYWxsKHByb3BzKXtcclxuXHRcdHRoaXMubmFtZSA9IHByb3BzLm5hbWU7XHJcblx0XHR0aGlzLmNvbG9yID0gcHJvcHMuY29sb3IgfHwgdGhpcy5jb2xvcjtcclxuXHRcdHRoaXMueCA9IHByb3BzLng7XHJcblx0XHR0aGlzLnkgPSBwcm9wcy55O1xyXG5cdFx0dGhpcy53aWR0aCA9IHByb3BzLndpZHRoO1xyXG5cdFx0dGhpcy5oZWlnaHQgPSBwcm9wcy5oZWlnaHQ7XHJcblx0fVxyXG5cclxuXHRXYWxsLnByb3RvdHlwZSA9IHtcclxuXHRcdHggOiAwLFxyXG5cdFx0eSA6IDAsXHJcblx0XHRoZWlnaHQgOiAwLFxyXG5cdFx0d2lkdGggOiAwLFxyXG5cdFx0bmFtZSA6IFwiXCIsXHJcblx0XHRjb2xvciA6IFwiZ3JheVwiLFxyXG5cdFx0ZHJhdyA6IGZ1bmN0aW9uKGNvbnRleHQpe1xyXG5cdFx0XHR0aGlzW3RoaXMubmFtZV0oY29udGV4dCk7XHJcblx0XHR9LFxyXG5cdFx0bGVmdDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLCh0aGlzLnkgKyAxKSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5zdHJva2UoKTtcclxuXHRcdH0sXHJcblx0XHRyaWdodDpmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKCh0aGlzLnggKiB0aGlzLndpZHRoKSArIHRoaXMud2lkdGgsdGhpcy55ICogdGhpcy5oZWlnaHQpO1xyXG5cdFx0XHRjb250ZXh0LmxpbmVUbygodGhpcy54ICsgMSkgKiB0aGlzLndpZHRoLCAodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9LFxyXG5cdFx0dG9wIDogZnVuY3Rpb24oY29udGV4dCl7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG5cdFx0XHRjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG5cdFx0XHRjb250ZXh0Lm1vdmVUbyh0aGlzLnggKiB0aGlzLndpZHRoLHRoaXMueSAqIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCx0aGlzLnkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHRcclxuXHRcdH0sXHJcblx0XHRib3R0b20gOiBmdW5jdGlvbihjb250ZXh0KXtcclxuXHRcdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XHJcblx0XHRcdGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcblx0XHRcdGNvbnRleHQubW92ZVRvKHRoaXMueCAqIHRoaXMud2lkdGgsKHRoaXMueSAqIHRoaXMuaGVpZ2h0KSArIHRoaXMuaGVpZ2h0KTtcclxuXHRcdFx0Y29udGV4dC5saW5lVG8oKHRoaXMueCAqIHRoaXMud2lkdGgpICsgdGhpcy53aWR0aCwodGhpcy55ICsgMSkgKiB0aGlzLmhlaWdodCk7XHJcblx0XHRcdGNvbnRleHQuc3Ryb2tlKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cmV0dXJuIFdhbGw7XHJcblxyXG59KCkpOyJdfQ==
