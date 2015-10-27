var StatementWS = (function(){
    "use strict";

    var shouldNotLoadMore = false;
    var chunkPerLoad = 10;

    var transactionsCurrentDate = [];
    var dataLoaded = false;

    function statementHandler(response){
        var statement = response.statement;
        transactionsCurrentDate = statement.transactions;
        var top10 = getNextChunkStatement();
        StatementUI.updateStatementTable(top10);

        dataLoaded = true;

        if (top10.length < 10){
            shouldNotLoadMore = true;
            $("#end-of-table").show();
        }

        $("#overlay_background").hide();
        $("#loading_in_progress").hide();
    }

    function getCurrentSelectedDate() {
        return moment.utc($("#statement-date").val());
    }

    function getStatementForCurrentSelectedDate(){

        var fromDate = getCurrentSelectedDate();
        var tillDate = moment(fromDate);
        tillDate.add(1, "d");

        var fromEpoch = fromDate.unix();
        var tillEpoch = tillDate.unix();

        StatementData.getStatement({dt_to: tillEpoch, dt_fm: fromEpoch});
    }

    function getNextChunkStatement(){
        return transactionsCurrentDate.splice(0, chunkPerLoad);
    }

    function initTable(){
        shouldNotLoadMore = false;
        transactionsCurrentDate = [];

        $(".error-msg").text("");
        StatementUI.clearTableContent();
        $(".notice-msg").attr("display", "none");
    }

    function loadStatementChunkWhenScroll(){
        //Attention: attach event to GLOBAL document : BAD!!
        $(document).scroll(function(){

            if (!dataLoaded || shouldNotLoadMore) {
                return;
            }

            function hidableHeight(percentage){
                var totalHidable = $document.height() - $(window).height();
                return Math.floor(totalHidable * percentage / 100);
            }

            var $document = $(document);
            var pFromTop = $document.scrollTop();
            var totalHeight = $document.height();

            if (pFromTop >= hidableHeight(70)) {
                var top10 = getNextChunkStatement();
                StatementUI.updateStatementTable(top10);
                if (top10.length < chunkPerLoad){
                    shouldNotLoadMore = true;
                    $("#end-of-table").show();
                }
            }
        });
    }

    function getStatementOneDayBefore(){
        var oneDayBefore = getCurrentSelectedDate();
        oneDayBefore.subtract(1, "d");

        var oneDayBeforeString = oneDayBefore.locale("en").format("YYYY-MM-DD").toString();

        $("#statement-date").val(oneDayBeforeString);       //set view
        getStatementForCurrentSelectedDate();
    }

    function getStatementOneDayAfter(){
        var oneDayAfter = getCurrentSelectedDate();
        oneDayAfter.add(1,"d");

        var oneDayAfterString = oneDayAfter.locale("en").format("YYYY-MM-DD").toString();

        $("#statement-date").val(oneDayAfterString);      //set view
        getStatementForCurrentSelectedDate();
    }

    function showIsLoading(){
        $("#overlay_background").show();
        $("#loading_in_progress").show();
    }

    function initPage(){
        showIsLoading();

        StatementUI.setDatePickerDefault(new Date());
        StatementUI.showButtonOnDateChange();

        $("#submit-date").click(function(){
            showIsLoading();
            initTable();
            getStatementForCurrentSelectedDate();
            $("#submit-date").addClass("invisible");
        });

        $("#older-date").click(function(){
            showIsLoading();
            initTable();
            getStatementOneDayBefore();
        });

        $("#newer-date").click(function(){
            showIsLoading();
            initTable();
            getStatementOneDayAfter();
        });

        StatementUI.createEmptyStatementTable().appendTo("#statement-ws-container");
        $("<div></div>", {
            class: "notice-msg",
            id: "end-of-table",
            text: "End of the table"
        }).appendTo("#statement-ws-container");

        $("#end-of-table").hide();

        getStatementForCurrentSelectedDate();
        loadStatementChunkWhenScroll();

        Content.statementTranslation();
    }

    function cleanStatementPageState(){
        initTable();
    }

    return {
        init: initPage,
        statementHandler: statementHandler,
        clean: cleanStatementPageState
    };
}());
