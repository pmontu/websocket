'use strict';
/**
 * @ngdoc overview
 * @name collaborativeLearning
 * @description
 * # collaborativeLearning
 *
 * Main module of the application.
 */
angular.module('collaborativeLearning')
.directive('checkData', function() {
  return {
    restrict: 'AE',
    replace: true,
    link: function(scope, elem, attrs) {
    	var sel = new Array();
      elem.bind('click', function() {
		if(angular.element(this).is(':checked')){
			console.log("data checked");
		}else{
			console.log("data unchcked");

		}
      });

    }
  };
})
.directive('sendData', function() {
  return {
    restrict: 'AE',
    replace: true,
    link: function(scope, elem, attrs) {
    	var sel = new Array();
      elem.bind('click', function() {
		angular.element("input.questions:checked").each(function (i, ob) { 
	       sel.push(angular.element(this).data('id'));
	     });
		$scope.ask_question(sel);
		console.log("asking questions", sel)
		angular.element("#playermsg").html("Thanks for sending questions. Please wait for the hoppr to send you the question...");
		angular.element(this).attr('disabled','disabled');
		
      });
	
    }
  };
}).directive('finishData', function($state) {
  return {
    restrict: 'AE',
    replace: true,
    link: function(scope, elem, attrs) {
    	var marks = new Array();
      elem.bind('click', function() {
      	var qid,cid;
		angular.element("input.choices:checked").each(function (i, ob) { 
			qid = angular.element(this).data('qid');
			cid = angular.element(this).data('cid');
	       marks.push({'questionid':qid,'answer':cid});
	     });
	    console.log(marks);
		$scope.submit_answer(marks);
		angular.element("#playermsg").html("Other player is giving the test. Please wait for the other players to complete...");
		angular.element(this).attr('disabled','disabled');
      });
	
    }
  };
})
;