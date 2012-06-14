(function($){
	$.widget("ui.queueManager",{
		options: {
			table: false,
			userID: 0,
			label: "",
			start: false,
			uncomplete: false,
			connection: false,
			debug: false,
			url: "processor.php"
		},
		_create: function(){
			var self = this;
			// add the queuecontainer and queue to the passed selecter
			self.element
				.addClass('queuecontainer')
				.append('<h3>'+self.options.label+'</h3>')
				.append('<a class="queue-plus">Add to the Queue</a>')
				.append('<ul class="queue">');
			$('a.queue-plus')
				.button({
					'icons': {
						'primary': 'ui-icon-plusthick'
					}
				})
				.disableSelection();
				
			// get task data from the server, parse it, and insert it into the ul.queue unordered list
			self._getData();
			
			// make the unordered list of tasks into a sortable list
			$('ul.queue',self.element).sortable({
				'revert': 250,
				'placeholder': 'ui-state-highlight ui-corner-all',
				'connectWith': self.options.connection,
				'update': function(){
					self._getQueueOrder();
				},
				'receive': function(event,ui){
					$.ajax({
						type: 'POST',
						url: self.options.url,
						data: 'action=changeOwner&task='+ui.item.data('id')+'&user='+self.options.userID
					});
				}
			}).disableSelection();
			$('#menuBtn')
				.after('<li class="menu-item ui-corner-all" style="display:none;"><a id="btn-refresh">Refresh</a></li>');
			$('#btn-refresh')
				.button({
					'icons': {
						'primary': 'ui-icon ui-icon-refresh'
					}
				})
				.bind('mousedown',function(){
					$('li.menu-item').toggle();
					self._getData();
					return false;
				});
			if(self.options.connection){
				$('#btn-refresh').button('option','label','Refresh '+self.options.label);
				$('#btn-manager').attr('href','index2.php').button('option','label','Back to me');
			} else {
				$('ul.menu li').eq(1)
					.after('<li class="menu-item ui-corner-all" style="display:none;"><a id="btn-timesheet-reset">Reset the daily totals</a></li>');
				$('#btn-timesheet-reset')
					.button({icons: {primary: 'ui-icon ui-icon-clock'}})
					.bind('mousedown',function(){
						$('li.menu-item').toggle();
						$.ajax({
							type: 'POST',
							url: self.options.url,
							data: 'action=resetDay&user='+self.options.userID,
							success: function(){
								if(self.options.table){
									$('#'+self.options.table+' tr:gt(0)').each(function(){
										$('td:eq(2)',$(this)).text('0.00');
									});							
								}
							}
						});
						return false;
					});		
			}
			if(self.options.uncomplete){
				$('<div id="completecontainer">')
					.append('<ul class="completes"><li id="completeBtn" class="ui-corner-all">Completed Tasks</li></ul>')
					.appendTo(document.body);
			}
			self._delegation();
		},
		getUserId: function(){
			return this.options.userID;
		},
		_refreshData: function(){
			var inst = this;
			$.ajax({
				type: 'POST',
				url: 'processor.php',
				data: 'action=refresh&user='+inst.options.userID,
				dataType: 'json',
				success: function(data){
					if(data){
						$.each(data,function(i,item){
							if(i == 'order'){
								var list = $('ul',inst.element);
								list.detach();
								$.each(item,function(i,e){
									$('#QI'+e,list).appendTo(list);
								});
								list.appendTo($('div.queuecontainer',inst.element))
							} else if((queueItem = $('#QI'+item.id)).length){
								queueItem.detach()
									.find('.queue-item-name')
										.text(item.name)
									.end()
									.find('.queue-item-type')
										.text(item.type)
									.end()
									.find('.details-notes')
										.html(item.details)
									.end()
									.data('variance',item.daily_time)
									.appendTo($('ul',inst.element));
							} else {
								inst._processItem(item);
							}
						});
					}
				}
			});
		},
		_getData: function(){
			var inst = this;
			$.ajax({
				type: 'POST',
				url: 'processor.php',
				data: 'action=restore&user='+inst.options.userID,
				dataType: 'json',
				success: function(data){
					inst._processData(data);
				}
			});
		},
		_processItem: function(item){
			var inst = this,
				el = $('ul',inst.element),
				active = false;
			if(item.type == ""){
				item.type = "--None--";
			}
			if(item.completed == 'F'){
				inst._addTask(item.id);
				var lineitem = $('li:last',el)
					.find('.queue-item-name')
						.text(item.name)
					.end()
					.find('.queue-item-type')
						.text(item.type)
					.end()
					.find('.details-notes')
						.html(item.details)
					.end()
					.data('variance',item.daily_time);
				if(item.active == 'T'){
					active = true;
					lineitem.addClass('queue-item-active');
					$('.stopwatch:last').button('option',{label:'Pause',icons:{primary: 'ui-icon-pause'}});
					$('#fancyClock').tzineClock('destroy').tzineClock({stopwatch: item.start_time,variance:item.daily_time});
				}
			}
			if(inst.options.table){
				inst._addTimesheetRow(item.id);
				if(item.daily_time != '0.00'){
					$('#LI'+item.id)
						.removeClass('ui-hidden');
				}
				$('#LI'+item.id)
					.find('td:eq(0)')
						.text(item.name)
					.end()
					.find('td:eq(1)')
						.text(item.type)
					.end()
					.find('td:eq(2)')
						.text(item.daily_time);
			}
			return active;
		},
		_processData: function(data){
			var inst = this,
				el = $('ul',inst.element),
				active = false;
			el.empty();
			$.each(data, function(i,item){
				if(inst._processItem(item)){
					active = true;
				}
			});
			if(active){
				$('.ui-icon-play').parent('.stopwatch').button('option','disabled',true);
			}
		},
		_addTask: function(id){
			var inst = this,
				el = $('ul.queue',inst.element),
				detailsDiv = $('<div class="details ui-corner-all">')
					.append('<div class="details-header">Details</div>')
					.append('<div class="details-notes editable details-notes-scroll"></div>')
					.append('<a class="queue-complete">Complete Task</a>'),
				task = $('<li>',{
					'class': 'queue-item ui-corner-all',
					'id': 'QI'+id,
					'data': {'id':id}
				})
					.append('<div class="queue-item-name editable">New Task</div>')
					.append('<div class="queue-item-type editable">Type</div>')
					.append(detailsDiv)
					.appendTo(el)
					.show('slide',{direction:'down',easing:'easeOutBounce'},500);
			if(inst.options.start){
				task.append('<a class="stopwatch">Start</a>');
			}
			$('.stopwatch',task).button({
				text:true,
				disabled:($('.stopwatch.ui-state-disabled').length > 0) ? true : false,
				icons:{
					primary: 'ui-icon-play'
				}
			});
			$('.queue-complete',task).button({text: true,icons: {primary: 'ui-icon-check'}});
		},
		_addTimesheetRow: function(id){
			$('#'+this.options.table+' tbody')
				.append('<tr id="LI'+id+'" class="ui-hidden"><td></td><td></td><td></td></tr>');
		},
		_getQueueOrder: function(){
			var el = $('ul',this.element),
				dataObj = {},
				orderObj = {};
			dataObj['action'] = 'queueOrder';
			dataObj['user'] = this.options.userID;
			$('li',el).each(function(i){
				orderObj[i] = $(this).data('id');
			});
			dataObj['order'] = orderObj;
			$.ajax({
				type: 'POST',
				url: 'processor.php',
				data: dataObj
			});
		},
		_delegation: function(){
			var inst = this,
				userID = inst.options.userID,
				el = inst.element;
			// BUTTONS: add task to the queue
			$('a.queue-plus',el).bind('mousedown',function(){
				var licount;
				$.ajax({
					type: 'POST',
					url: inst.options.url,
					data: 'action=add&user='+userID,
					success: function(data){
						licount = data;
					},
					async: false
				});
				inst._addTask(licount);
				if(inst.options.table) inst._addTimesheetRow(licount);
				return false;
			});
			// EDITABLE: enables in-place editing	
			el.delegate('.editable','dblclick', replaceHTML);  
			// EDITABLE: saves changes of in-place editing
			el.delegate('.btnSave','mousedown', function(){
				var editable = $(this).parent(),
			   		newText = $(this).siblings("form")  
						.children(".editBox")
							.val().replace(/"/g, "&quot;").replace(/\n/g,"<br>"),
					queueID = $(this).closest('li').data('id'),
					dataObj = {
						'task': queueID,
						'text': newText.replace(/&quot;/g, '"')
					};
				if(editable.parent().hasClass('details')){
					editable.addClass('details-notes-scroll');
					dataObj['action'] = 'editDetails';
				} else if(editable.hasClass('queue-item-type')){
					$('#LI'+queueID+' td:eq(1)').text(newText);
					dataObj['action'] = 'editType';
				} else {
					$('#LI'+queueID+' td:eq(0)').text(newText);
					dataObj['action'] = 'editTask';
				}
				$.ajax({
					type: 'POST',
					url: inst.options.url,
					data: dataObj
				});
				
				editable
					.html(newText)  
					.removeClass("noPad")
					.addClass('editable');
				return false;
			});
			// EDITABLE: discard changes from in-place editing
			el.delegate('.btnDiscard','mousedown', function(){
				var editable = $(this).parent(),
					oldtext = editable.data('oldtext');
				if(editable.parent().hasClass('details')){
					editable.addClass('details-notes-scroll');
				}
				editable
					.html(oldtext)  
					.removeClass("noPad")  
					.addClass('editable');
				return false;
			});   
			// EDITABLE: sets up the input field in place of old text for in-place editing
			function replaceHTML(){ 
				var $this = $(this),
					oldText = $(this).html().replace(/"/g, "&quot;").replace(/\n/g,"<br>"),
					inputField = '';
				$this.data('oldtext',oldText);
				if($this.parent().hasClass('details')){
					$this.removeClass('details-notes-scroll');
					inputField = '<form><textarea class="editBox"></textarea></form><a href="#" class="btnSave">Save changes</a> <a href="#" class="btnDiscard">Discard changes</a>';
					oldText = oldText.replace(/\<br\>/g,"\n");
				} else if($this.hasClass('queue-item-type')){
					if((oldText == '--None--') || (oldText == 'Type')) oldText = "";
					inputField = '<form><select class="editBox"><option value="">--None--</option><option value="Internal - Company Holiday">Internal - Company Holiday</option><option value="Internal - Management">Internal - Management</option><option value="Internal - Meetings">Internal - Meetings</option><option value="Internal - Other">Internal - Other</option><option value="Internal - Professional Development">Internal - Professional Development</option><option value="Internal - PTO">Internal - PTO</option><option value="Internal - PTO Credit">Internal - PTO Credit</option><option value="Internal Systems">Internal Systems</option><option value="Internal - Training">Internal - Training</option><option value="Marketing - General Marketing">Marketing - General Marketing</option><option value="Sales - Client Call">Sales - Client Call</option><option value="Sales - Client Meetings">Sales - Client Meetings</option><option value="Sales - Client Other">Sales - Client Other</option><option value="Sales - Client Proposal">Sales - Client Proposal</option><option value="Sales - Project Set Up">Sales - Project Set Up</option><option value="Design - Project Manager">Design - Project Manager</option><option value="Design - Tech Guru">Design - Tech Guru</option><option value="Design - Analyst">Design - Analyst</option><option value="Design - Ops Director / RSC">Design - Ops Director / RSC</option><option value="Admin - Project Manager">Admin - Project Manager</option><option value="Admin - Tech Guru">Admin - Tech Guru</option><option value="Admin - Analyst">Admin - Analyst</option><option value="Admin - Ops Director / RSC">Admin - Ops Director / RSC</option><option value="Analysis - Project Manager">Analysis - Project Manager</option><option value="Analysis - Tech Guru">Analysis - Tech Guru</option><option value="Analysis - Analyst">Analysis - Analyst</option><option value="Analysis - Ops Director / RSC">Analysis - Ops Director / RSC</option><option value="Time To Make It Right">Time To "Make It Right"</option></select></form><a href="#" class="btnSave">Save changes</a> <a href="#" class="btnDiscard">Discard changes</a>';
				} else {
					inputField = '<form><input type="text" class="editBox" value="" /></form><a href="#" class="btnSave">Save changes</a> <a href="#" class="btnDiscard">Discard changes</a>';
				}
				$this.addClass("noPad")
					.html(inputField)
					.removeClass('editable')
					.find('.editBox')
						.val(oldText)
						.focus();
				return false;
			}
			// EDITABLE: prevents the enter button from triggering form submition
			el.delegate('.editBox','keydown', function(e){
				if (e.keyCode == '13') {
					switch(this.type){
						case 'textarea': return true;
						case 'text': $('.btnSave',$(this).closest('.noPad')).trigger('click'); return false;
						case 'select-one': return false;
					}
				}
				return true;
			});
			// BUTTONS: show/hide task details
			el.delegate('.queue-item','contextmenu',function(e){
				var i = $(this);
				if($('.editBox').length > 0){
					return true;
				} else {
					if($('.details',i).is(':visible')){
						$('.details')
							.fadeOut(250);
					} else {
						$('.details')
							.fadeOut(250);
						var cssObj = {};
						if(i.offset().left < 350){
							cssObj['right'] = 'auto';
							cssObj['left'] = 350;
						}
						if(i.offset().top > 350){
							cssObj['top'] = 'auto';
							cssObj['bottom'] = 0;
						} else {
							cssObj['bottom'] = 'auto';
							cssObj['top'] = 0;
						}
						$('.top-level').removeClass('top-level');
						$('.details',i)
							.css(cssObj)
							.addClass('top-level')
							.fadeIn(500);
					}
				}
				return false;
			});
			// BUTTONS: task completion
			el.delegate('.queue-complete','mousedown',function(){
				var lineitem = $(this).closest('li');
				$.ajax({
					type: 'POST',
					url: 'processor.php',
					data: 'action=complete&task='+lineitem.data('id'),
					success: function(){
						if(lineitem.hasClass('queue-item-active')){
							lineitem
								.find('.stopwatch')
									.trigger('click');
						}
						lineitem.remove();
						inst._getQueueOrder();
					}
				});
				return false;
			});
			if(inst.options.start){
				$('#fancyClock').bind('contextmenu',function(){
					$(this).addClass('ui-hidden');
					return false;
				});
				// BUTTONS: time-control buttons
				el.delegate('.stopwatch','mousedown',function(){
					var $this = $(this),
						disabled = $this.button( "option", "disabled" );
					if(!disabled){
						var lineitem = $this.closest('li');
						if($this.text() == "Start"){
							$('.stopwatch').not($this).button('option','disabled',true);
							lineitem.addClass('queue-item-active');
							$.ajax({
								type: 'POST',
								url: inst.options.url,
								data: 'action=start&task='+lineitem.data('id')
							});
							$this.button('option',{label:'Pause',icons:{primary: 'ui-icon-pause'}});
							$('#fancyClock').tzineClock('destroy').tzineClock({stopwatch: new Date(),variance:lineitem.data('variance')});
						} else {
							$('.stopwatch').button('option','disabled',false);
							lineitem.removeClass('queue-item-active');
							var taskID = lineitem.data('id');
							$.ajax({
								type: 'POST',
								url: inst.options.url,
								data: 'action=pause&task='+lineitem.data('id'),
								dataType: 'json',
								success: function(data){
									lineitem.data('variance',data.daily_time);
									if(inst.options.table){
										$('#LI'+taskID)
											.removeClass('ui-hidden')
											.find('td:eq(2)')
												.text(data.daily_time);
									}
								}
							});
							$this.button('option',{label:'Start',icons:{primary: 'ui-icon-play'}});
							$('#fancyClock').tzineClock('pause');
						}
					}
				});
			} //End if no timer
			if(inst.options.uncomplete){
				// BUTTONS: opens completed tasks
				$('#completeBtn')
					.data('ref',0)
					.bind('mousedown',function(){
						var ref = $(this).data('ref');
						$('.top-level').removeClass('top-level');
						$(this).closest('.completes').addClass('top-level');
						$.ajax({
							type: 'POST',
							url: inst.options.url,
							data: 'action=getCompletes&start='+ref+'&user='+inst.options.userID,
							dataType: 'json',
							success: function(data){
								if(!data){
									$('#completeBtn-hide').trigger('click');
								} else {
									$('.complete-item').remove();
									$('<li>',{
										id: 'completeBtn-hide',
										'class': 'complete-item ui-corner-all',
										text: 'Hide Completes' 
									})
										.prependTo('.completes');
										$.each(data, function(i,item){
									var listitem = $('<li>',{
										'class': 'complete-item ui-corner-all',
										data: {id: item.id}
									})
										.append('<div class="complete-item-name">'+item.name+'</div>')
										.append('<div class="complete-item-type">'+item.type+'</div>')
										.append('<a class="complete-restore">Uncomplete</a>')
										.insertAfter('#completeBtn-hide')
										.show('slide',{direction:'down',easing:'easeOutBounce'},500);
										$('.complete-restore',listitem).button({text: false,icons: {primary: 'ui-icon-unlocked'}});
								});
								$('#completeBtn').data('ref',(ref+10));
								}
							}		
						});
						return false;
					});
				// BUTTONS: closes opened completed tasks
				$('.completes')
					.delegate('#completeBtn-hide','mousedown',function(){
						$('#completeBtn').data('ref',0);
						$('.complete-item').fadeOut(500).remove();
						return false;
					})
				// BUTTONS: restores a completed task to the queue
					.delegate('.complete-restore','mousedown',function(){
						var lineitem = $(this).closest('li');
						$.ajax({
							type: 'POST',
							url: inst.options.url,
							data: 'action=unComplete&task='+lineitem.data('id'),
							dataType: 'json',
							success: function(data){
								if(data.type == "") data.type = "--None--";
								inst._addTask(data.id);
								$('li:last',el)
									.find('.queue-item-name')
										.text(data.name)
									.end()
									.find('.queue-item-type')
										.text(data.type)
									.end()
									.find('.details-notes')
										.html(data.details)
									.end()
									.data('variance',data.daily_time);
								lineitem.fadeOut(250).remove();
								if(inst.options.table){
									inst._addTimesheetRow(data.id);
									if(data.daily_time != '0.00'){
										$('#LI'+data.id)
											.removeClass('ui-hidden');
									}
									$('#LI'+data.id)
										.find('td:eq(0)')
											.text(data.name)
										.end()
										.find('td:eq(1)')
											.text(data.type)
										.end()
										.find('td:eq(2)')
											.text(data.daily_time);
									}
								}
							});
						return false;
					});
			} // End if uncomplete
		},
		destroy: function() {
			$.Widget.prototype.destroy.apply(this, arguments); // default destroy
			this.element.empty();
		}
	});
	
	var menu = $('<ul class="menu ui-corner-all">')
		.append('<li id="menuBtn" class="ui-corner-all">Open Menu</li>')
		.append('<li><br /></li>')
		.append('<li><a id="btn-manager" href="manager.html">Manager View</a></li>')
		.append('<li><a id="btn-manager" href="#">Reports</a></li>')
		.append('<li><a id="btn-help">Help</a></li>')
		.append('<li><a id="btn-logout">Logout</a></li>')
		.appendTo('#menucontainer');
	$('#btn-logout').button({icons: {primary: 'ui-icon-eject'}});
	$('#btn-manager').button({icons: {primary: 'ui-icon-person'}});
	$('#btn-help').button({icons: {primary: 'ui-icon-help'}});
	// BUTTONS: opens menu
	$('#menuBtn')
		.bind('mousedown',function(){
			$('.top-level').removeClass('top-level');
			$('.menu-item').toggle().parent().addClass('top-level');
		})
		.siblings()
			.addClass('menu-item ui-corner-all ')
			.hide();
	// BUTTONS: logout
	$('#btn-logout').bind('mousedown',function(){
		window.location.href = 'login.html';
	});
	// BUTTONS: help
	$('#btn-help').bind('mousedown',function(){
		$('.menu-item').toggle();
		$('.top-level').removeClass('top-level');
		$('<div>',{
			id:'help-box',
			'class':'ui-corner-all top-level ui-hidden'
			})
			.appendTo(document.body);
		$('#help-box')
			.position({
				my:'center',
				at:'center',
				of:window
			})
			.load('help.html',function(){
				$('<a id="btn-close">Close</a>')
					.button({icons: {primary: 'ui-icon-close'}})
					.bind('mousedown',function(){$(this).parent().remove();})
					.prepentTo($(this));
			})
			.fadeIn('250');
	});
	
})(jQuery);