<!-- multistep form -->
<div class="aParent">
    <div>
        <form id="msform" class="display-form">

            <!-- fieldsets -->
            <fieldset>
                <h2 class="fs-title">Enter Topic</h2>
                <input type="text" name="topic" id="topic_name" class="stop-fetch" placeholder="Topic" />
                <input type="submit" name="next" class="action-button" value="Show Data" />
            </fieldset>

        </form>
    </div>
    <div>
        <form id="download" class="display-form">

            <!-- fieldsets -->
            <fieldset>
                <h2 class="fs-title">Select Date to Download</h2>
                <input type="text" name="daterange" />
                <input type="button" name="next" class="action-button" value="Download" />
            </fieldset>

        </form>
    </div>
</div>
<div class="cards" id="display-div" style="display: none;">
    <div class="card card-1">
         <table id="add_data">
            <tbody></tbody>
         </table>
        <p class="card__apply">
            <a class="card__link" id="timestamp_1"><i class="fas fa-arrow-right"></i></a>
        </p>
    </div>
</div>

<script type="text/javascript">
    jQuery('#topic_name').on('input', function () {
        jQuery("#display-div").hide();
        jQuery("#topic_name").addClass("stop-fetch");
    });
    jQuery(document).ready(function () {
        setInterval(function () {
            if (!jQuery("#topic_name").hasClass('stop-fetch')) {
                sendAjaxRequest($('#topic_name').val())
            }
        }, 5000);

        $('input[name="daterange"]').daterangepicker();
        jQuery("#msform").validate({
            ignore: [],
            rules: {
                topic: {
                    required: true,
                },
            }
        })



        const form = document.getElementById('msform');

        form.addEventListener('submit', function (event) {
            const label = document.querySelector('label[for="topic_name"]');

            // Wait for 5 seconds before removing the label
            if (label) {
                setTimeout(function () {
                    label.style.display = "none";
                }, 5000);
            }
            const $form = jQuery("#msform");
            const result = $form.valid()
            event.preventDefault(); // Prevent the default form submission
            if (result) {
                sendAjaxRequest($("#topic_name").val())
            }
        });

    })

    function sendAjaxRequest(topicName) {
        jQuery.ajax({
            url: '/topic',
            type: 'POST',
            data: { topic: topicName }
        }).done(response => {
            if (response.data && Object.keys(response.data).length != 0) {
                jQuery("#display-div").show();
                jQuery("#topic_name").removeClass("stop-fetch");
                 var dataList = document.getElementById('add_data');
                 jQuery("#add_data tbody").html('');
var newRow = $("<tr>");
     var cols = "";
                cols += '<th>TIMESTAMP</th>';
                cols += '<th>PAYLOAD</th>';
                  newRow.append(cols);
                    $("#add_data tbody").append(newRow);

            response.data.forEach(function(item) {
                var newRow = $("<tr>");
                var cols = "";
                cols += '<td>' +item.timestamp+'</td>';
                 cols += '<td>' +item.payload + '</td>';
                  newRow.append(cols);
                       $("#add_data tbody").append(newRow);

            });
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            jQuery("#display-div").hide();
            jQuery("#topic_name").addClass("stop-fetch");
            jQuery("#add_data tbody").html('');
        });
    }

    

</script>
