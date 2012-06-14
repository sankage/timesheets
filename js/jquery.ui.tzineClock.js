(function($){
	$.widget("ui.tzineClock", {
 		// default options
		options: {
			countdown: false,
			days: false,
			stopwatch: false,
			variance: false
		},
		_gVars: {},
		_create: function() {
			// creation code for mywidget
			// can use this.options
			
			var colors = ['pink','orange','blue','green'];
		
			var tmp;
			var start = 1;
			if(this.options.days) start = 0;
			
			if(this.options.variance) this.options.variance = parseFloat(this.options.variance);
			
			if($(this.element).hasClass('ui-hidden')) $(this.element).removeClass('ui-hidden');
			
			for(var i=start;i<4;i++){
				// Creating a new element and setting the color as a class name:
			
				tmp = $('<div>',{
					'class': colors[i]+' clock',
					html: '<div class="display"></div>'+				
						'<div class="front left"></div>'+
						'<div class="rotate left">'+
							'<div class="bg left"></div>'+
						'</div>'+
						'<div class="rotate right">'+
							'<div class="bg right"></div>'+
						'</div>'
				});
			
				// Appending to the container:
				this.element.append(tmp);
			
				// Assigning some of the elements as variables for speed:
				tmp.rotateLeft = tmp.find('.rotate.left');
				tmp.rotateRight = tmp.find('.rotate.right');
				tmp.display = tmp.find('.display');
			
				// Adding the dial as a global variable. Will be available as gVars.colorName
				this._gVars[colors[i]] = tmp;
			}
			this.start();
		},
		_intID: null,
		start: function() {
			var opts = this.options;
			var gVars = this._gVars;
			var self = this;
			self._intID = setInterval(function(){
				if(opts.countdown){
					var currentTime = new Date();
					var futureTime = Date.parse(opts.countdown);
					var dd = futureTime-currentTime;
        
					if(opts.days) var d=Math.floor((dd%(60*60*1000*24*365))/(24*60*60*1000)*1);
					var h=Math.floor((dd%(60*60*1000*24))/(60*60*1000)*1);
					var m=Math.floor(((dd%(60*60*1000*24))%(60*60*1000))/(60*1000)*1);
					var s=Math.floor((((dd%(60*60*1000*24))%(60*60*1000))%(60*1000))/1000*1);
				} else if(opts.stopwatch){
					var currentTime = new Date();
					var currentTime = Date.parse(currentTime);
					var startTime = Date.parse(opts.stopwatch);
					var dd = currentTime+(self.options.variance*3600000)-startTime;
					
					var h=Math.floor((dd%(60*60*1000*24))/(60*60*1000)*1);
					var m=Math.floor(((dd%(60*60*1000*24))%(60*60*1000))/(60*1000)*1);
					var s=Math.floor((((dd%(60*60*1000*24))%(60*60*1000))%(60*1000))/1000*1);
					if(opts.days) var d=Math.floor((dd%(60*60*1000*24*365))/(24*60*60*1000)*1);
				
				} else {
					var currentTime = new Date();
					var h = currentTime.getHours();
					var m = currentTime.getMinutes();
					var s = currentTime.getSeconds();
					if(opts.days) var d = currentTime.getDay()+1;
				}
				self._animation(gVars.green, s, 60);
				self._animation(gVars.blue, m, 60);
				self._animation(gVars.orange, h, 24);
				if(opts.days) self._animation(gVars.pink, d, 365);
		        
			},1000);
		},
		pause: function(){
			clearInterval(this._intID);
		},
		resume: function(variance){
			console.log(variance);
			this.options.variance = parseFloat(variance);
			this.options.stopwatch = new Date();
			this.start();
		},
		_animation: function(clock, current, total){
			// Calculating the current angle:
			var angle = (360/total)*(current+1);
			var element;

			if(current==0){
				// Hiding the right half of the background:
				clock.rotateRight.hide();
				// Resetting the rotation of the left part:
				this._rotateElement(clock.rotateLeft,0);
			}
			if(angle<=180){
				// The left part is rotated, and the right is currently hidden:
				element = clock.rotateLeft;
				clock.rotateRight.hide();
			} else {
				// The first part of the rotation has completed, so we start rotating the right part:
				clock.rotateRight.show();
				clock.rotateLeft.show();
			
				this._rotateElement(clock.rotateLeft,180);
			
				element = clock.rotateRight;
				angle = angle-180;
			}

			this._rotateElement(element,angle);
		
			// Setting the text inside of the display element, inserting a leading zero if needed:
			clock.display.html(current<10?'0'+current:current);
		},
		_rotateElement: function(element,angle){
			// Rotating the element, depending on the browser:
			var rotate = 'rotate('+angle+'deg)';
		
			if(element.css('MozTransform')!=undefined)
				element.css('MozTransform',rotate);
			else if(element.css('WebkitTransform')!=undefined)
				element.css('WebkitTransform',rotate);
	
			// A version for internet explorer using filters, works but is a bit buggy (no surprise here):
			else if(element.css("filter")!=undefined){
				var cos = Math.cos(Math.PI * 2 / 360 * angle);
				var sin = Math.sin(Math.PI * 2 / 360 * angle);
				element.css("filter","progid:DXImageTransform.Microsoft.Matrix(M11="+cos+",M12=-"+sin+",M21="+sin+",M22="+cos+",SizingMethod='auto expand',FilterType='nearest neighbor')");
				element.css("left",-Math.floor((element.width()-200)/2));
				element.css("top",-Math.floor((element.height()-200)/2));
			}
		},	
		destroy: function() {
			$.Widget.prototype.destroy.apply(this, arguments); // default destroy
			this.element.empty();
		}
	});
})(jQuery);