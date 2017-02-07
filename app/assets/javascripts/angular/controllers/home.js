angular.module('MyApp')
  .controller('HomeCtrl', ['$scope', '$rootScope', '$state', '$auth', '$q', 'Task', '$uibModal', '$interval', 'uiCalendarConfig', function($scope, $rootScope, $state, $auth, $q, Task, $uibModal, $interval, uiCalendarConfig) {
    $scope.formData = { searchTerm: '' };
    $scope.viewChanged = function( view, element ) {
      reloadTasks(view);
    };

    /* config object */
    $scope.uiConfig = {
      calendar:{
        viewRender: $scope.viewChanged,
        header:{
          left: 'month agendaWeek agendaDay',
          center: 'title',
          right: 'today prev,next'
        },
        nowIndicator:true,
        editable: true,
        eventClick: function(event) {
        // opens events in a popup window
          window.open(event.url);
          return false;
        },
        eventDrop: function(event, delta, revertFunc, jsEvent, ui, view) {
          console.log(event);
          console.log(delta);
          Task.get(event.id).then(function (task) {
            var due_moment = moment(moment(task.due_date) + delta);
            task.due_date = due_moment.toDate();
            console.log(task);
            task.save().then(function(data) {

            }, function(error) { 
              revertFunc();
            }) 
          });
        },
        eventMouseover: function(calEvent, jsEvent) {
          var tooltip = '<div class="tooltipevent" style="padding:30px;min-width:200px;width:auto;max-width:60%;height:100px;background:#ccc;position:absolute;z-index:10001;">' + calEvent.title + '</div>';
          var $tooltip = $(tooltip).appendTo('body');

          $(this).mouseover(function(e) {
            $(this).css('z-index', 10000);
            $tooltip.fadeIn('500');
            $tooltip.fadeTo('10', 1.9);
          }).mousemove(function(e) {
            $tooltip.css('top', e.pageY + 10);
            $tooltip.css('left', e.pageX + 20);
          });
        },
        eventMouseout: function(calEvent, jsEvent) {
            $(this).css('z-index', 8);
            $('.tooltipevent').remove();
        },
        loading: function(bool) {
          $('#loading').toggle(bool);
        }
      }
    };
    
    $scope.eventsSource = [];

    var intervalStarted = false;
    function startInterval() {
      if (!intervalStarted) {
        intervalStarted = true;
        console.log('interval started');
        $interval(function() {
          console.log('interval reached');
          reloadTasks();
        }, 10 * 60 * 1000);
      }
    };

    function successLogged(data) {
      startInterval();
      reloadTasks();
    };

    $scope.loginWithTrello = function() {
      $auth.authenticate('trello')
        .then(successLogged)
        .catch(function(resp) {
          console.log(resp);
          //logOrRegisterWithUUID();
        });
    };

    $scope.isAuthenticated = function() {
      return $auth.userIsAuthenticated();
    };

    function validate() {
      $auth.validateUser().then(successLogged, function(result) {
        // deixa a pessoa fazer seu próprio login
        // setTimeout(logOrRegisterWithUUID, 100);
        return result;
      });
    };
    
    function taskToEvent(task) {
      // console.log(startDate);
      // console.log(endDate);

      var event = { id: task.id,
        title: task.project_name + '\r\n' + task.name,
        start: moment(task.start_date).toDate(),
        end: moment(task.due_date).toDate(),
        allDay: task.all_day,
        description: task.description,
        url: task.external_url };

      if (task.completed)
        event.color = 'green';

      console.log(event);

      return event;
    };

    function filterEvents(events,searchTerm) {
      var filteredEvents = [];
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var matches = event.title.match(searchTerm);
        if (matches)
          filteredEvents.push(event);
      }
      return filteredEvents;
    };

    function fillTasks(startDate, endDate) {
      $scope.loadingEvents = true;
      Task.query({startDate: startDate, endDate: endDate}).then(function(data) {
        $scope.tasks = data;
        var events = $scope.tasks.map(function(item) {
          return taskToEvent(item);
        });
        if ($scope.formData.searchTerm && $scope.formData.searchTerm.length > 0) {
          events = filterEvents(events, $scope.formData.searchTerm);
        }
        var hoursSum = 0;
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          if (!event.allDay) {
            hoursSum += moment(event.end).diff(moment(event.start), 'hours', true);
          }
        }
        $scope.hoursSum = hoursSum;

        if ($scope.eventsSource.length > 0)
          $scope.eventsSource.splice(0, 1)
        $scope.eventsSource.push(events);
        $scope.events = events;
        $scope.loadingEvents = false;
      });
    };

    function reloadTasks(view) {
      console.log('reloadTasks reached');

      if (!view)
        view = uiCalendarConfig.calendars.tasksCalendar.fullCalendar('getView');
      var newStart = null;
      var newEnd = null;
      if (view.start && view.end) {
        newStart = moment(view.start.toISOString()).local().toDate();
        newEnd = moment(view.end.toISOString()).local().toDate();
      } else {
        newStart = moment(view.intervalStart.toISOString()).local().toDate();
        newEnd = moment(view.intervalEnd.toISOString()).local().toDate();
      }
      fillTasks(newStart, newEnd);
    }

    if ($scope.isAuthenticated()) {
      successLogged($rootScope.user);
    } else {
      startInterval();
    }

    $scope.refreshTasks = function() {
      reloadTasks();
    };

    $scope.showiCal = false;
    $scope.toggleICal = function() {
      $scope.showiCal = !$scope.showiCal;
    };

    $scope.newProject = function() {
      var modalInstance = $uibModal.open({
        animation: true,
        size: 'lg',
        templateUrl: 'projects/new.html',
        controller: 'NewProjectCtrl'
      });

      modalInstance.result.then(function (newGroupRequest) {
        alert('projeto criado com sucesso!');
        reloadTasks();
      }, function () {
        reloadTasks();
      });
    }

    // var isMob = window.cordova !== undefined;
    // if (isMob)
    //   document.addEventListener("deviceready", validate, false);
    // else
    //   validate();
  }]);
