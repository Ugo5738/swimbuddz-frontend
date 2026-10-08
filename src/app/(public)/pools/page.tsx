import {redirect} from "next/navigation";

/** The public discovery contract is SwimBuddz bookable inventory, never
 * raw partner facility rates or a referral to book directly with a pool.
 */
export default function PoolLocations(){
 redirect("/pool-access");
}
