(function(){

	"use strict";

	var main = null,
		Maze = require("../app/core/maze"),
		Config = require("../app/core/config-maze");

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
			var codeSolution = this.editor.getSession().getValue();

			codeSolution = eval(codeSolution);	

			var result = codeSolution.bind(this.maze)(0,0,this.maze.width - 1 , this.maze.height -1);

			if(this.maze.animationInterval && this.maze.mainInterval){
				this.maze.stopAnimation();
				this.maze.clearCell(this.context,this.maze.lastNode);
			}

			if(result && result.length){
				this.maze.drawSolution(this.context,result);
			}

			/*this.fetchMazeSolution({
				cells : this.maze.cells
			}).then(function(response){
				this.maze.drawSolution(this.context,response);
			}.bind(this));*/
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